"use client";

import { moodOrder, moods, type MoodId } from "@/data/moods";
import { bucketLabels, type SongBucket } from "@/data/songs";
import type { FanSpeed } from "./TrainExperience";

/**
 * The controls, as a rail down the right-hand wall under the fan — the mirror of
 * the route panel on the left.
 *
 * Four controls and a share key, and no more: the rail has to fit the wall
 * without scrolling on a short laptop, and everything here does visibly what its
 * label says.
 *
 * Deliberately NOT here:
 *  - "Announcements", which only ever gated a door chime. There is no recorded
 *    announcement to toggle, so the label promised something that did not exist.
 *    The chime still plays on arrival.
 *  - "Journey mode: window / door side". v3 dropped the door-view plate, so it
 *    only changed vibration and scroll speed — real, but not what "door side"
 *    implies. Worth restoring if a door plate is ever generated.
 */
export function ControlRail({
  moodId,
  onMood,
  bucket,
  onCycleBucket,
  focus,
  onFocus,
  fanSpeed,
  onFan,
  onShare,
  shareNote,
}: {
  moodId: MoodId;
  onMood: (m: MoodId) => void;
  bucket: SongBucket | null;
  onCycleBucket: () => void;
  focus: boolean;
  onFocus: (v: boolean) => void;
  fanSpeed: FanSpeed;
  onFan: (v: FanSpeed) => void;
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
        label="Focus mode"
        value={focus ? "Scenery only" : "Just travel"}
        glyph={focus ? "◉" : "◎"}
        onClick={() => onFocus(!focus)}
        pressed={focus}
      />

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
