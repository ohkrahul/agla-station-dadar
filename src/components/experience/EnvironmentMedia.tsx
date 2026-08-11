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
   * playbackRate is ramped rather than stepped, because a plate that stops dead
   * reads as a broken loop instead of a train arriving. Rate 0 is invalid in
   * some browsers, so the floor is a pause once the ramp has run down.
   */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let raf = 0;
    const from = el.paused ? 0 : el.playbackRate;
    const to = speed;
    const start = performance.now();
    const ms = 2600;

    if (to > 0 && el.paused) void el.play().catch(() => {});

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // Ease out, so most of the slowing happens early like real braking.
      const eased = 1 - (1 - t) ** 3;
      const rate = from + (to - from) * eased;

      if (rate <= 0.06) {
        el.pause();
      } else {
        if (el.paused) void el.play().catch(() => {});
        el.playbackRate = Math.min(1, rate);
      }

      if (t < 1) raf = requestAnimationFrame(step);
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
