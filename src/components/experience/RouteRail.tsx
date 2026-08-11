"use client";

import { stations, terminus, TRAVEL_SECONDS, DWELL_SECONDS } from "@/data/stations";

/**
 * The route down the left-hand wall, where the photograph leaves the carriage
 * free. Passed stops are muted, the current one carries in gold, upcoming ones
 * sit between — the order is real information, so the list is a real list.
 *
 * Stops are clickable: skipping ahead is the one thing a listener actually
 * wants that waiting cannot give them.
 */
export function RouteRail({
  index,
  atStation,
  onJumpTo,
}: {
  index: number;
  atStation: boolean;
  onJumpTo: (i: number) => void;
}) {
  const remaining = stations.length - 1 - index;
  const seconds = remaining * (TRAVEL_SECONDS + DWELL_SECONDS);
  const mins = Math.round(seconds / 60);
  /* The line is compressed to about eight minutes end to end, so "00:08 hr"
     would read as eight past the hour. Show hours only once there are any. */
  const eta =
    mins >= 60
      ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")} hr`
      : `${mins} min`;

  return (
    <nav className="route-rail panel" aria-label="Route">
      <p className="chip-label mb-2 flex items-center gap-1.5">
        <span aria-hidden>▤</span> Your route
      </p>

      <ol className="min-h-0 flex-1 overflow-y-auto pr-1">
        {stations.map((s, i) => {
          const state = i < index ? "past" : i === index ? "current" : "ahead";
          return (
            <li key={s.id}>
              <button
                type="button"
                className="rail-stop"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => onJumpTo(i)}
              >
                <span aria-hidden className="rail-dot" />
                <span className="truncate">{s.english}</span>
                {state === "current" && (
                  <span aria-hidden className="ml-auto text-[0.7rem]">
                    {atStation ? "◼" : "▶"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 flex items-end justify-between gap-3 border-t border-gold/15 pt-2">
        <div>
          <p className="chip-label">Destination</p>
          <p className="t-signage text-[1rem] text-gold">{terminus.english}</p>
        </div>
        <div className="text-right">
          <p className="chip-label">Est. time</p>
          <p className="t-ticket text-cream-lit">{eta}</p>
        </div>
      </div>
    </nav>
  );
}
