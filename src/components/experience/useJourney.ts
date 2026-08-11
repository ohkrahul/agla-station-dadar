"use client";

import { useCallback, useEffect, useState } from "react";

import { DWELL_SECONDS, TRAVEL_SECONDS, stations } from "@/data/stations";

/**
 * Where the train is in its cycle.
 *
 * `arriving` and `departing` exist so the deceleration reads physically instead
 * of the scenery snapping between moving and still (§7.3).
 */
export type Phase = "traveling" | "arriving" | "stopped" | "departing";

/** Where the listener is sitting. Changes framing and motion, not the plate. */
export type Seat = "window" | "door";

const MS: Record<Phase, number> = {
  traveling: TRAVEL_SECONDS * 1000,
  arriving: 4000,
  stopped: DWELL_SECONDS * 1000,
  departing: 3000,
};

/** Environment speed per phase. 0 means the plate is held still. */
const SPEED: Record<Phase, number> = {
  traveling: 1,
  arriving: 0,
  stopped: 0,
  departing: 1,
};

/**
 * `index` is always the station in focus: the one being approached while
 * traveling, and the one stood at while stopped. Starting at 1 means the journey
 * opens having just left Churchgate, heading for Marine Lines.
 */
export function useJourney({ running }: { running: boolean }) {
  const [index, setIndex] = useState(1);
  const [phase, setPhase] = useState<Phase>("traveling");

  useEffect(() => {
    if (!running) return;

    const id = setTimeout(() => {
      if (phase === "traveling") setPhase("arriving");
      else if (phase === "arriving") setPhase("stopped");
      else if (phase === "stopped") setPhase("departing");
      else {
        // Loop the line rather than stranding the listener at Borivali.
        setIndex((i) => (i + 1) % stations.length);
        setPhase("traveling");
      }
    }, MS[phase]);

    return () => clearTimeout(id);
  }, [phase, running]);

  const station = stations[index];
  const previous = stations[(index - 1 + stations.length) % stations.length];

  /** Jumping the queue from the route rail: arrive at the chosen stop. */
  const jumpTo = useCallback((i: number) => {
    setIndex(((i % stations.length) + stations.length) % stations.length);
    setPhase("arriving");
  }, []);

  return {
    jumpTo,
    /** The station being approached, or stood at. */
    station,
    previous,
    index,
    total: stations.length,
    phase,
    /** True while the carriage should vibrate. */
    moving: running && (phase === "traveling" || phase === "departing"),
    speed: running ? SPEED[phase] : 0,
    /** The board is on screen from the moment of arrival until departure. */
    boardVisible: phase === "arriving" || phase === "stopped",
    atStation: phase === "arriving" || phase === "stopped",
  };
}
