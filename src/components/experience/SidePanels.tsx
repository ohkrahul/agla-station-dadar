"use client";

import { moodOrder, moods, type MoodId } from "@/data/moods";
import { bucketLabels, type SongBucket } from "@/data/songs";
import type { Seat } from "./useJourney";
import type { FanSpeed } from "./TrainExperience";

/**
 * The controls, as a rail down the right-hand wall under the fan — the mirror of
 * the route rail on the left. Reading top to bottom like the route does, rather
 * than as a strip of chips along the bottom.
 *
 * Every entry is a real control, not a badge.
 */
export function ControlRail({
  moodId,
  onMood,
  bucket,
  onCycleBucket,
  announcements,
  onAnnouncements,
  focus,
  onFocus,
  fanSpeed,
  onFan,
  seat,
  onSeat,
  onShare,
  shareNote,
}: {
  moodId: MoodId;
  onMood: (m: MoodId) => void;
  bucket: SongBucket | null;
  onCycleBucket: () => void;
  announcements: boolean;
  onAnnouncements: (v: boolean) => void;
  focus: boolean;
  onFocus: (v: boolean) => void;
  fanSpeed: FanSpeed;
  onFan: (v: FanSpeed) => void;
  seat: Seat;
  onSeat: (s: Seat) => void;
  onShare: () => void;
  shareNote: string | null;
}) {
  const fanOrder: FanSpeed[] = ["off", "slow", "normal"];

  return (
    <div className="control-rail panel">
      <p className="chip-label mb-1.5 flex items-center gap-1.5">
        <span aria-hidden>▤</span> Carriage
      </p>

      <RailButton
        label="Playlist"
        value={bucket ? bucketLabels[bucket] : "All tracks"}
        glyph="♫"
        onClick={onCycleBucket}
      />

      {/* The mood switch, as the reference's weather chip: one control, cycling. */}
      <RailButton
        label="Weather"
        value={moods[moodId].label}
        glyph={moods[moodId].glyph}
        onClick={() => {
          const i = moodOrder.indexOf(moodId);
          onMood(moodOrder[(i + 1) % moodOrder.length]);
        }}
      />

      <RailButton
        label="Fan"
        value={fanSpeed}
        glyph="✿"
        onClick={() => onFan(fanOrder[(fanOrder.indexOf(fanSpeed) + 1) % fanOrder.length])}
      />

      <RailButton
        label="Announcements"
        value={announcements ? "On" : "Off"}
        glyph="🔉"
        onClick={() => onAnnouncements(!announcements)}
        pressed={announcements}
      />

      <RailButton
        label="Focus mode"
        value={focus ? "Scenery only" : "Just travel"}
        glyph={focus ? "◉" : "◎"}
        onClick={() => onFocus(!focus)}
        pressed={focus}
      />

      {/*
        Where you are sitting.
        v3 dropped the door-view video, so this is not a different plate — it
        changes how the same plate is framed and how hard it moves: a door seat
        sits nearer the opening, so the view is faster and shakier. Honest about
        what it is rather than promising footage that does not exist.
      */}
      <fieldset className="mt-2 border-t border-gold/15 pt-2">
        <legend className="sr-only">Journey mode</legend>
        <p className="chip-label mb-1">Journey mode</p>
        <div className="flex gap-1">
          {(
            [
              { id: "window", label: "Window", glyph: "▤" },
              { id: "door", label: "Door", glyph: "▥" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={seat === o.id}
              onClick={() => onSeat(o.id)}
              className="mode-key flex-1 justify-center"
              data-on={seat === o.id}
            >
              <span aria-hidden>{o.glyph}</span>
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={onShare} className="share-key mt-2 w-full justify-center">
        <span aria-hidden>⤴</span> {shareNote ?? "Share journey"}
      </button>
    </div>
  );
}

function RailButton({
  label,
  value,
  glyph,
  onClick,
  pressed,
}: {
  label: string;
  value: string;
  glyph: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rail-chip"
      aria-pressed={pressed}
      aria-label={`${label}: ${value}. Change`}
    >
      <span aria-hidden className="w-4 shrink-0 text-center text-gold/80">
        {glyph}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="chip-label block truncate">{label}</span>
        <span className="chip-value block truncate capitalize">{value}</span>
      </span>
    </button>
  );
}
