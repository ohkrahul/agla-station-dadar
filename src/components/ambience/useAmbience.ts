"use client";

import { useEffect, useRef, useState } from "react";

import type { Phase } from "@/components/experience/useJourney";

/**
 * Independent ambience layers (§20 — never flatten them into one track).
 *
 * The files are licensed/owned recordings the project supplies; none is
 * generated. Until they exist this hook reports `available: false` and does
 * nothing audible, so development is never blocked by a missing asset — but it
 * also never pretends to be playing something it isn't.
 */
const DIR = "/agla-station/audio";

const LAYERS = {
  train: `${DIR}/train-loop.mp3`,
  rain: `${DIR}/rain-loop.mp3`,
  station: `${DIR}/station-bed.mp3`,
  door: `${DIR}/door-beep.mp3`,
} as const;

type LayerName = keyof typeof LAYERS;

/** Target level per layer, by journey phase. Door is a one-shot, not a bed. */
function levels(phase: Phase, raining: boolean) {
  const atStation = phase === "arriving" || phase === "stopped";
  return {
    train: phase === "traveling" ? 1 : phase === "departing" ? 0.7 : atStation ? 0 : 0,
    rain: raining ? 0.6 : 0,
    station: atStation ? 0.75 : 0,
  };
}

export function useAmbience({
  boarded,
  phase,
  raining,
}: {
  boarded: boolean;
  phase: Phase;
  raining: boolean;
}) {
  const elements = useRef<Partial<Record<LayerName, HTMLAudioElement>>>({});
  const [available, setAvailable] = useState<boolean | null>(null);
  const [volume, setVolume] = useState(0.6);
  const [muted, setMuted] = useState(false);

  // Build the elements once the listener has boarded (autoplay needs a gesture).
  useEffect(() => {
    if (!boarded || Object.keys(elements.current).length) return;

    let loaded = 0;
    let failed = 0;
    const names = Object.keys(LAYERS) as LayerName[];

    for (const name of names) {
      const el = new Audio(LAYERS[name]);
      el.preload = "auto";
      el.loop = name !== "door";
      el.volume = 0;
      el.addEventListener("canplaythrough", () => {
        loaded++;
        setAvailable(true);
      });
      el.addEventListener("error", () => {
        failed++;
        if (failed === names.length) setAvailable(false);
      });
      elements.current[name] = el;
    }

    return () => {
      for (const el of Object.values(elements.current)) {
        el?.pause();
        el.src = "";
      }
      elements.current = {};
    };
  }, [boarded]);

  // Follow the journey. Beds are faded rather than cut (§20).
  useEffect(() => {
    if (!boarded) return;
    const target = levels(phase, raining);
    const master = muted ? 0 : volume;

    for (const [name, level] of Object.entries(target) as [LayerName, number][]) {
      const el = elements.current[name];
      if (!el) continue;
      fade(el, level * master);
      if (level * master > 0 && el.paused) void el.play().catch(() => {});
    }
  }, [boarded, phase, raining, volume, muted]);

  // Door cue fires once, on arrival.
  useEffect(() => {
    if (!boarded || phase !== "arriving") return;
    const el = elements.current.door;
    if (!el) return;
    el.currentTime = 0;
    el.volume = muted ? 0 : Math.min(1, volume * 0.9);
    void el.play().catch(() => {});
  }, [boarded, phase, volume, muted]);

  return { available, volume, setVolume, muted, setMuted };
}

/** Short linear ramp. Hard cuts on a 60-second bed are very audible. */
function fade(el: HTMLAudioElement, to: number, ms = 900) {
  const from = el.volume;
  if (Math.abs(from - to) < 0.01) return;
  const start = performance.now();

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t < 1) requestAnimationFrame(step);
    else if (to === 0) el.pause();
  };

  requestAnimationFrame(step);
}
