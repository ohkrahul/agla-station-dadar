"use client";

import { LINE_NAME, origin, terminus, type Station } from "@/data/stations";
import { moods, type MoodId } from "@/data/moods";

/**
 * The band across the top of the carriage: identity, which line, how full the
 * train is, the weather outside, and the master ambience level.
 */
export function TopBar({
  station,
  atStation,
  moodId,
  ambienceLevel,
  onAmbienceChange,
  ambienceAvailable,
}: {
  station: Station;
  atStation: boolean;
  moodId: MoodId;
  ambienceLevel: number;
  onAmbienceChange: (v: number) => void;
  ambienceAvailable: boolean;
}) {
  const mood = moods[moodId];

  return (
    <div className="top-bar">
      <Wordmark />

      {/*
        Portrait only. The route rail carries this on wider screens, but portrait
        hides the rail for want of width — without this a phone would show no
        station name at all between stops.
      */}
      <div className="panel chip chip-portrait" role="status" aria-live="polite">
        <div>
          <p className="chip-label">{atStation ? "This station" : "Next station"}</p>
          <p className="chip-value">{station.english}</p>
        </div>
      </div>

      {/* Dropped on portrait: the indicator already says where you are, and the
          wordmark already says what this is. */}
      <div className="panel chip chip-secondary">
        <div>
          <p className="chip-label">{LINE_NAME}</p>
          <p className="chip-value">
            {origin.english} → {terminus.english}
          </p>
        </div>
      </div>

      <div className="panel chip chip-secondary">
        <span aria-hidden className="text-gold/70">
          ▮▮▮
        </span>
        <div>
          <p className="chip-value">{crowdFor(station)}</p>
          <p className="chip-label">Passengers aboard</p>
        </div>
      </div>

      {/* Also portrait-secondary: the rail's Weather control already reports it,
          and the bar cannot hold the station, the weather and the fader at 390px. */}
      <div className="panel chip chip-secondary">
        <span aria-hidden className="text-[1.1rem] leading-none">
          {mood.glyph}
        </span>
        <div>
          <p className="chip-value">{mood.weather}</p>
          <p className="chip-label">{mood.label} · Mumbai</p>
        </div>
      </div>

      <label className="panel chip ml-auto">
        <span aria-hidden className="text-gold/80">
          🔊
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={ambienceLevel}
          disabled={!ambienceAvailable}
          onChange={(e) => onAmbienceChange(Number(e.target.value))}
          className="volume-slider w-24"
          aria-label="Ambience volume"
        />
        <span className="chip-value w-9 text-right tabular-nums">{ambienceLevel}%</span>
      </label>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="wordmark shrink-0">
      <p className="t-signage text-[1.15rem] leading-[0.94] tracking-[0.02em] text-gold">
        Agla
        <br />
        Station
      </p>
      <p className="chip-label mt-1">Mumbai Local Radio</p>
    </div>
  );
}

/**
 * A crowd figure, derived rather than invented: it is a fixed function of where
 * you are on the line, so it moves as you travel and is the same for everyone.
 * Deliberately labelled "aboard" and not "right now" — this is set dressing for
 * a nostalgic toy, not a live feed, and it should not pretend otherwise.
 */
function crowdFor(station: Station): number {
  const seed = [...station.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  // Mumbai locals are famously over capacity; 380–520 reads as a full carriage.
  return 380 + (seed % 141);
}
