"use client";

import { moodOrder, moods, type MoodId } from "@/data/moods";
import { bucketLabels, type SongBucket } from "@/data/songs";
import type { Seat } from "./useJourney";
import type { FanSpeed } from "./TrainExperience";

/**
 * Where you are sitting.
 *
 * v3 dropped the door-view video, so this is not a different plate — it changes
 * how the same plate is framed and how hard it moves: a door seat sits nearer
 * the opening, so the view is wider, faster and shakier. Honest about what it
 * is rather than promising footage that does not exist.
 */
export function JourneyMode({ seat, onSeat }: { seat: Seat; onSeat: (s: Seat) => void }) {
  const options: { id: Seat; label: string; glyph: string }[] = [
    { id: "window", label: "Window seat", glyph: "▤" },
    { id: "door", label: "Door side", glyph: "▥" },
  ];

  return (
    <fieldset className="journey-mode panel">
      <legend className="chip-label px-1">Journey mode</legend>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={seat === o.id}
            onClick={() => onSeat(o.id)}
            className="mode-key"
            data-on={seat === o.id}
          >
            <span aria-hidden>{o.glyph}</span>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The strip along the bottom: the handful of things worth changing mid-journey.
 * Every one of them is a real control, not a badge.
 */
export function BottomBar({
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
  onShare: () => void;
  shareNote: string | null;
}) {
  const fanOrder: FanSpeed[] = ["off", "slow", "normal"];

  return (
    <div className="bottom-bar">
      <BarButton
        label="Playlist"
        value={bucket ? bucketLabels[bucket] : "All tracks"}
        glyph="♫"
        onClick={onCycleBucket}
        after="›"
      />

      {/* The mood switch, as the reference's weather chip: one control, cycling. */}
      <BarButton
        label="Weather"
        value={moods[moodId].label}
        glyph={moods[moodId].glyph}
        onClick={() => {
          const i = moodOrder.indexOf(moodId);
          onMood(moodOrder[(i + 1) % moodOrder.length]);
        }}
      />

      <BarButton
        label="Fan"
        value={fanSpeed}
        glyph="✿"
        onClick={() => onFan(fanOrder[(fanOrder.indexOf(fanSpeed) + 1) % fanOrder.length])}
      />

      <BarButton
        label="Announcements"
        value={announcements ? "On" : "Off"}
        glyph="🔉"
        onClick={() => onAnnouncements(!announcements)}
        pressed={announcements}
      />

      <BarButton
        label="Focus mode"
        value={focus ? "Scenery only" : "Just travel"}
        glyph={focus ? "◉" : "◎"}
        onClick={() => onFocus(!focus)}
        pressed={focus}
      />

      <button type="button" onClick={onShare} className="share-key ml-auto">
        <span aria-hidden>⤴</span> {shareNote ?? "Share journey"}
      </button>
    </div>
  );
}

function BarButton({
  label,
  value,
  glyph,
  onClick,
  after,
  pressed,
}: {
  label: string;
  value: string;
  glyph: string;
  onClick: () => void;
  after?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel chip bar-chip"
      aria-pressed={pressed}
      aria-label={`${label}: ${value}. Change`}
    >
      <span aria-hidden className="text-gold/80">
        {glyph}
      </span>
      <span className="text-left">
        <span className="chip-label block">{label}</span>
        <span className="chip-value block capitalize">{value}</span>
      </span>
      {after && (
        <span aria-hidden className="ml-1 text-gold/60">
          {after}
        </span>
      )}
    </button>
  );
}
