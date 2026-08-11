"use client";

import { useEffect, useRef } from "react";

import type { Mood } from "@/data/moods";

/**
 * What sits behind the window glass.
 *
 * Monsoon plays the one Veo clip, which loops seamlessly in the file itself, so
 * no crossfade is needed here. The other two moods are stills that drift.
 *
 * Crossfading between moods (§7.2 — "do not hard-cut") is done by rendering all
 * three stacked and animating opacity, rather than swapping the source: swapping
 * would restart the video and flash a poster frame mid-transition.
 */
export function EnvironmentMedia({
  mood,
  active,
  speed,
}: {
  mood: Mood;
  active: boolean;
  speed: number;
}) {
  const common = "absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out";
  const opacity = active ? 1 : 0;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /**
   * Braking and pulling away, done on the video's own clock.
   *
   * Two things here are deliberate and were both learned the hard way, because
   * the first version made arrivals look like the video was lagging:
   *
   * 1. The rate never goes below MIN_RATE. Slowing a 24fps clip to 0.06 leaves
   *    about 1.4 unique frames a second — measured at 4fps across an arrival —
   *    which reads as a stutter, not as a train stopping. At 0.55 it is still
   *    13fps, slow but smooth. The plate then pauses outright, which is correct:
   *    a stopped train is a still image.
   *
   * 2. The rate is quantised and only assigned when it actually changes. The
   *    original set playbackRate on every animation frame — 131 assignments per
   *    arrival — and each one makes the media pipeline resync. Stepping in 0.05s
   *    cuts that to about ten.
   */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const MIN_RATE = 0.55;
    const STEP = 0.05;
    const ms = 1800;

    let raf = 0;
    const from = el.paused ? MIN_RATE : el.playbackRate;
    const to = speed > 0 ? 1 : MIN_RATE;
    const start = performance.now();
    let assigned = -1;

    if (speed > 0 && el.paused) {
      el.playbackRate = MIN_RATE;
      assigned = MIN_RATE;
      void el.play().catch(() => {});
    }

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // Ease out, so most of the change happens early like real braking.
      const eased = 1 - (1 - t) ** 3;
      const raw = from + (to - from) * eased;
      const rate = Math.round(raw / STEP) * STEP;

      if (rate !== assigned) {
        el.playbackRate = Math.min(1, Math.max(MIN_RATE, rate));
        assigned = rate;
      }

      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else if (speed === 0) {
        // Hold the frame rather than creep along it.
        el.pause();
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  if (mood.media.kind === "video") {
    return (
      <div className={common} style={{ opacity }} aria-hidden={!active}>
        {/* The still underneath doubles as the poster and as the
            prefers-reduced-motion fallback, since CSS can hide a video but
            cannot substitute one. */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mood.media.poster})` }}
        />
        <video
          ref={videoRef}
          className="env-video absolute inset-0 h-full w-full object-cover"
          src={mood.media.src}
          poster={mood.media.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      </div>
    );
  }

  /*
   * No video for this mood by design (§3), so travel comes from scrolling a
   * mirror-doubled tile. Two copies side by side make the ribbon exactly twice
   * the loop distance, so translating by -50% lands on an identical arrangement
   * and repeats forever with no seam and no direction change.
   */
  return (
    <div className={`env-still ${common}`} style={{ opacity }} aria-hidden={!active}>
      <div className="env-ribbon" style={{ animationPlayState: speed === 0 ? "paused" : "running" }}>
        <img src={mood.media.tile} alt="" />
        <img src={mood.media.tile} alt="" />
      </div>
    </div>
  );
}
