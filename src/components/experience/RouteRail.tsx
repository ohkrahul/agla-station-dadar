"use client";

import { stations, terminus, TRAVEL_SECONDS, DWELL_SECONDS } from "@/data/stations";

/**
 * Where you are going, compactly.
 *
 * This used to list all ten stops, which on a short laptop made the panel taller
 * than the wall and forced it to scroll — a scrollbar inside a carriage fitting
 * reads as a bug. Only the station being approached is named in full; the two
 * after it are offered as small links so skipping ahead still works.
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
  const station = stations[index];
  const upcoming = [1, 2]
    .map((n) => ({ i: index + n, s: stations[index + n] }))
    .filter((x) => x.s);

  const remaining = stations.length - 1 - index;
  const mins = Math.round((remaining * (TRAVEL_SECONDS + DWELL_SECONDS)) / 60);
  const eta =
    mins >= 60
      ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")} hr`
      : `${mins} min`;

  return (
    <nav className="route-rail panel" aria-label="Route">
      <div className="flex items-baseline justify-between gap-2">
        <p className="chip-label">{atStation ? "This station" : "Next station"}</p>
        <p className="t-ticket text-[0.6rem] text-cream-lit/45">
          {String(index + 1).padStart(2, "0")}/{stations.length}
        </p>
      </div>

      <p className="t-devanagari mt-0.5 text-[1.15rem] leading-tight text-gold">
        {station.marathi}
      </p>
      <p className="t-signage text-[1.5rem] leading-none text-cream-lit">
        {station.english}
      </p>

      {upcoming.length > 0 && (
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="chip-label">Then</span>
          {upcoming.map(({ i, s }, n) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onJumpTo(i)}
              className="rail-then"
              aria-label={`Skip ahead to ${s.english}`}
            >
              {s.english}
              {n < upcoming.length - 1 ? " ·" : ""}
            </button>
          ))}
        </p>
      )}

      <div className="mt-2 flex items-end justify-between gap-3 border-t border-gold/15 pt-1.5">
        <div>
          <p className="chip-label">Destination</p>
          <p className="t-signage text-[0.95rem] text-cream-lit">{terminus.english}</p>
        </div>
        <div className="text-right">
          <p className="chip-label">Est. time</p>
          <p className="t-ticket text-cream-lit">{eta}</p>
        </div>
      </div>
    </nav>
  );
}
