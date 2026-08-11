"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { playable, type Song, type SongBucket } from "@/data/songs";
import { YT_STATE, loadIframeApi, playerVars, type YTPlayer } from "@/lib/youtube";

export type RadioStatus = "off" | "loading" | "playing" | "paused" | "unavailable";

/**
 * One player instance, cued with different video IDs (§6 — "only one player").
 *
 * The player is not created until the listener boards, so no iframe loads and no
 * autoplay is attempted before a real user gesture.
 */
export function useRadio({
  boarded,
  bucket,
}: {
  boarded: boolean;
  /** null means the whole playlist. */
  bucket: SongBucket | null;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  /** Read inside YouTube's callbacks, which close over their creation scope. */
  const indexRef = useRef(0);

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<RadioStatus>("off");
  /** Read inside timers and YouTube callbacks, which close over stale state. */
  const statusRef = useRef<RadioStatus>("off");
  statusRef.current = status;
  const [volume, setVolume] = useState(70);
  const [note, setNote] = useState<string | null>(null);
  /** Songs YouTube refused. Kept so skipping cannot loop over them forever. */
  const deadRef = useRef<Set<string>>(new Set());

  /**
   * The active list. A bucket with nothing in it would strand the player, so an
   * empty filter falls back to everything rather than showing a dead deck.
   */
  const list = useMemo(() => {
    if (!bucket) return playable;
    const filtered = playable.filter((s) => s.buckets.includes(bucket));
    return filtered.length ? filtered : playable;
  }, [bucket]);

  /** Read inside YouTube's callbacks, which close over their creation scope. */
  const listRef = useRef(list);
  listRef.current = list;

  const current: Song | undefined = list[Math.min(index, list.length - 1)];

  const goTo = useCallback((next: number) => {
    const l = listRef.current;
    if (l.length === 0) return;
    const wrapped = ((next % l.length) + l.length) % l.length;
    indexRef.current = wrapped;
    setIndex(wrapped);
    playerRef.current?.loadVideoById(l[wrapped].youtubeId);
  }, []);

  /**
   * §6: handle embed errors by moving on automatically. If every remaining song
   * is refused, stop rather than spin — and say so plainly.
   */
  const skipBroken = useCallback(() => {
    const l = listRef.current;
    const failed = l[indexRef.current];
    if (failed) deadRef.current.add(failed.youtubeId);

    if (l.every((s) => deadRef.current.has(s.youtubeId))) {
      setStatus("unavailable");
      setNote("No songs are playable here. They may be blocked in this region.");
      return;
    }

    let next = indexRef.current;
    do {
      next = (next + 1) % l.length;
    } while (deadRef.current.has(l[next].youtubeId));

    setNote(`${failed?.title ?? "That track"} cannot be embedded — skipping.`);
    goTo(next);
  }, [goTo]);

  // Create the player once, on boarding.
  useEffect(() => {
    if (!boarded || playerRef.current || !mountRef.current) return;
    if (list.length === 0) {
      setStatus("unavailable");
      setNote("No songs curated yet.");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    loadIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId: listRef.current[indexRef.current].youtubeId,
          width: "100%",
          height: "100%",
          playerVars: playerVars(),
          events: {
            onReady: () => {
              playerRef.current?.setVolume(volume);
              playerRef.current?.playVideo();

              /*
               * Boarding is a real user gesture, so playback should be allowed —
               * but browsers differ on how long that permission lasts and some
               * refuse unmuted playback outright. If nothing is playing shortly
               * after, say so: a silent paused frame looks broken, and YouTube
               * shows its title and related-video overlay while paused, which is
               * exactly the chrome we are trying not to display.
               */
              setTimeout(() => {
                if (statusRef.current !== "playing") {
                  setStatus("paused");
                  setNote("Your browser held playback — press play.");
                }
              }, 2500);
            },
            onStateChange: (e) => {
              if (e.data === YT_STATE.PLAYING) {
                setStatus("playing");
                setNote(null);
              } else if (e.data === YT_STATE.PAUSED) setStatus("paused");
              else if (e.data === YT_STATE.ENDED) goTo(indexRef.current + 1);
            },
            onError: skipBroken,
          },
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatus("unavailable");
        setNote(err.message);
      });

    return () => {
      cancelled = true;
    };
    // volume is read once to seed the player; later changes go through setLevel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boarded, goTo, skipBroken]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  /**
   * Elapsed position, for the deck's progress bar.
   *
   * Polled rather than event-driven because the IFrame API emits no timeupdate.
   * Twice a second is enough for a progress bar and cheap; the interval only
   * exists while something is actually playing.
   */
  const [position, setPosition] = useState({ at: 0, of: 0 });
  useEffect(() => {
    if (status !== "playing") return;
    const read = () => {
      const p = playerRef.current;
      if (!p) return;
      setPosition({ at: p.getCurrentTime() ?? 0, of: p.getDuration() ?? 0 });
    };
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, [status, index]);

  const seek = useCallback((fraction: number) => {
    const p = playerRef.current;
    if (!p) return;
    const d = p.getDuration();
    if (!d) return;
    p.seekTo(Math.max(0, Math.min(1, fraction)) * d, true);
  }, []);

  /**
   * Changing the filter starts that shelf from the top, but only once the deck
   * exists — otherwise it would fight the initial cue on boarding.
   */
  useEffect(() => {
    if (!playerRef.current) return;
    indexRef.current = 0;
    setIndex(0);
    playerRef.current.loadVideoById(list[0].youtubeId);
  }, [list]);

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const previous = useCallback(() => goTo(indexRef.current - 1), [goTo]);

  const setLevel = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setVolume(clamped);
    playerRef.current?.setVolume(clamped);
  }, []);

  /**
   * Station announcements duck the music rather than pausing it (§9). Ratio, not
   * an absolute level, so it respects whatever the listener chose.
   */
  const duck = useCallback(
    (on: boolean) => playerRef.current?.setVolume(on ? Math.round(volume * 0.7) : volume),
    [volume]
  );

  return {
    mountRef,
    current,
    index,
    total: list.length,
    status,
    note,
    volume,
    position,
    play,
    pause,
    next,
    previous,
    seek,
    setLevel,
    duck,
  };
}
