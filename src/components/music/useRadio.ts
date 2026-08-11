"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { playable, type Song } from "@/data/songs";
import { YT_STATE, loadIframeApi, playerVars, type YTPlayer } from "@/lib/youtube";

export type RadioStatus = "off" | "loading" | "playing" | "paused" | "unavailable";

/**
 * One player instance, cued with different video IDs (§6 — "only one player").
 *
 * The player is not created until the listener boards, so no iframe loads and no
 * autoplay is attempted before a real user gesture.
 */
export function useRadio({ boarded }: { boarded: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  /** Read inside YouTube's callbacks, which close over their creation scope. */
  const indexRef = useRef(0);

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<RadioStatus>("off");
  const [volume, setVolume] = useState(70);
  const [note, setNote] = useState<string | null>(null);
  /** Songs YouTube refused. Kept so skipping cannot loop over them forever. */
  const deadRef = useRef<Set<string>>(new Set());

  const current: Song | undefined = playable[index];

  const goTo = useCallback((next: number) => {
    if (playable.length === 0) return;
    const wrapped = ((next % playable.length) + playable.length) % playable.length;
    indexRef.current = wrapped;
    setIndex(wrapped);
    playerRef.current?.loadVideoById(playable[wrapped].youtubeId);
  }, []);

  /**
   * §6: handle embed errors by moving on automatically. If every remaining song
   * is refused, stop rather than spin — and say so plainly.
   */
  const skipBroken = useCallback(() => {
    const failed = playable[indexRef.current];
    if (failed) deadRef.current.add(failed.youtubeId);

    if (deadRef.current.size >= playable.length) {
      setStatus("unavailable");
      setNote("No songs are playable here. They may be blocked in this region.");
      return;
    }

    let next = indexRef.current;
    do {
      next = (next + 1) % playable.length;
    } while (deadRef.current.has(playable[next].youtubeId));

    setNote(`${failed?.title ?? "That track"} cannot be embedded — skipping.`);
    goTo(next);
  }, [goTo]);

  // Create the player once, on boarding.
  useEffect(() => {
    if (!boarded || playerRef.current || !mountRef.current) return;
    if (playable.length === 0) {
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
          videoId: playable[indexRef.current].youtubeId,
          width: "100%",
          height: "100%",
          playerVars: playerVars(),
          events: {
            onReady: () => {
              playerRef.current?.setVolume(volume);
              playerRef.current?.playVideo();
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
    total: playable.length,
    status,
    note,
    volume,
    play,
    pause,
    next,
    previous,
    setLevel,
    duck,
  };
}
