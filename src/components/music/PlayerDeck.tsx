"use client";

import { bucketLabels } from "@/data/songs";
import type { useRadio } from "./useRadio";
import { Knob } from "./Knob";

type Radio = ReturnType<typeof useRadio>;

/**
 * The deck: cover art, what is playing, progress, transport, volume.
 *
 * The YouTube player itself is NOT here — it is mounted hidden by
 * <HiddenPlayer/> and this shows the video's thumbnail in its place. That is a
 * deliberate choice by the project owner, and worth being clear about in code as
 * well as in conversation: Required Minimum Functionality expects an embedded
 * player to stay visible, so a hidden one can have embedding revoked for the
 * domain. If playback starts failing across every track at once, that is the
 * cause — removing .player-hidden restores a compliant 200x200 player.
 */
export function PlayerDeck({ radio }: { radio: Radio }) {
  const { current, status, note, index, total, position } = radio;
  const isPlaying = status === "playing";
  const disabled = status === "off" || status === "unavailable";
  const progress = position.of > 0 ? position.at / position.of : 0;

  return (
    <section className="player-deck panel" aria-label="Radio">
      <div className="deck-art">
        {current ? (
          <img
            src={`https://i.ytimg.com/vi/${current.youtubeId}/mqdefault.jpg`}
            alt={`${current.title} cover art`}
            width={320}
            height={180}
            /* Falls back through YouTube's other sizes: mqdefault is missing for
               a few older uploads. */
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.retried) {
                img.dataset.retried = "1";
                img.src = `https://i.ytimg.com/vi/${current.youtubeId}/hqdefault.jpg`;
              }
            }}
          />
        ) : (
          <span className="t-label grid h-full w-full place-items-center text-steel-lit/35">
            Off
          </span>
        )}
      </div>

      <div className="deck-info">
        <div className="deck-meta flex items-baseline justify-between gap-3">
          <p className="chip-label">Now playing</p>
          <p className="t-ticket text-[0.6rem] text-cream-lit/45">
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </p>
        </div>

        <p className="deck-title truncate text-[1.05rem] leading-tight text-cream-lit">
          {current?.title ?? "—"}
        </p>
        <p className="deck-artist truncate text-[0.78rem] leading-snug text-cream-lit/60">
          {current ? `${current.artist} • ${current.year}` : ""}
        </p>

        {/* Errors replace the shelf label, because both answer "what is on?". */}
        {note ? (
          <p
            className="deck-shelf mt-0.5 truncate text-[0.7rem] text-gold"
            role="status"
            aria-live="polite"
          >
            {note}
          </p>
        ) : (
          current && (
            <p className="deck-shelf chip-label mt-0.5 truncate text-gold/70">
              {bucketLabels[current.buckets[0]]}
            </p>
          )
        )}

        <Progress
          at={position.at}
          of={position.of}
          onSeek={radio.seek}
          disabled={disabled || position.of === 0}
        />

        <div className="deck-transport flex items-center gap-2">
          <DeckKey label="Previous song" onClick={radio.previous} disabled={disabled}>
            <SkipIcon back />
          </DeckKey>
          <button
            type="button"
            onClick={isPlaying ? radio.pause : radio.play}
            disabled={disabled}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="deck-play"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <DeckKey label="Next song" onClick={radio.next} disabled={disabled}>
            <SkipIcon />
          </DeckKey>
        </div>
      </div>

      <div className="deck-knob">
        <p className="chip-label">Volume</p>
        <Knob
          value={radio.volume}
          onChange={radio.setLevel}
          disabled={disabled}
          label="Music volume"
        />
      </div>
    </section>
  );
}

/**
 * Elapsed position, and a real scrubber.
 *
 * A range input rather than a styled div: dragging, arrow keys and a screen
 * reader all work without reimplementing any of it.
 */
function Progress({
  at,
  of,
  onSeek,
  disabled,
}: {
  at: number;
  of: number;
  onSeek: (fraction: number) => void;
  disabled?: boolean;
}) {
  const pct = of > 0 ? (at / of) * 100 : 0;

  return (
    <div className="deck-progress">
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(pct * 10)}
        disabled={disabled}
        onChange={(e) => onSeek(Number(e.target.value) / 1000)}
        className="scrub"
        style={{ ["--pct" as string]: `${pct}%` }}
        aria-label="Seek within track"
        aria-valuetext={`${clock(at)} of ${clock(of)}`}
      />
      <span className="t-ticket deck-clock">
        {clock(at)} / {clock(of)}
      </span>
    </div>
  );
}

function clock(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * The actual player, kept out of sight.
 *
 * `opacity: 0` rather than `display: none`: a display-none iframe is not laid
 * out, and browsers will refuse to start or will suspend playback in it. It also
 * stays inside the viewport for the same reason — an element parked far
 * off-screen gets deprioritised.
 */
export function HiddenPlayer({ radio }: { radio: Radio }) {
  return (
    <div className="player-hidden" aria-hidden>
      <div ref={radio.mountRef} className="h-full w-full" />
    </div>
  );
}

function DeckKey({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="deck-key"
    >
      {children}
    </button>
  );
}

/* Inline SVG rather than glyphs like ⏮ and ▮▮: those pick up a different font on
   every platform, and rendered as emoji on some. These are always identical. */

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="7" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" />
      <rect x="13.4" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}

function SkipIcon({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      style={back ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M6 6v12l9-6z" fill="currentColor" />
      <rect x="16.5" y="6" width="2.4" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
