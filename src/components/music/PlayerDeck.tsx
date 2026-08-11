"use client";

import { bucketLabels } from "@/data/songs";
import type { useRadio } from "./useRadio";
import { Knob } from "./Knob";

type Radio = ReturnType<typeof useRadio>;

/**
 * The deck, mounted into the carriage wall below the window.
 *
 * §6 is a hard constraint, not a style choice: the iframe stays visible,
 * uncropped, never below 200x200, and NOTHING is drawn over it. So it takes the
 * place a cassette window would occupy on a real deck, and every bit of physical
 * character lives in the frame, the bolts and the plate AROUND it. Do not add a
 * texture, gradient, scanline or clickable overlay inside `.player-screen`.
 */
export function PlayerDeck({ radio }: { radio: Radio }) {
  const { current, status, note, index, total } = radio;
  const isPlaying = status === "playing";
  const disabled = status === "off" || status === "unavailable";

  return (
    <section className="player-deck panel" aria-label="Radio">
      {/* Left bay: the player, and nothing else. A caption row under it made the
          console taller than the wall below the glass, so the deck covered the
          window — that metadata now sits in the info column where it belongs. */}
      <div className="deck-bay">
        <div className="player-screen relative bg-black">
          <div ref={radio.mountRef} className="h-full w-full" />
          {status === "off" && (
            <p className="t-label absolute inset-0 grid place-items-center text-steel-lit/35">
              Unit off
            </p>
          )}
        </div>
      </div>

      {/* Middle: what is on. */}
      <div className="deck-info">
        <div className="flex items-baseline justify-between gap-3">
          <p className="chip-label">Now playing</p>
          <p className="t-ticket text-[0.6rem] text-cream-lit/45">
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[1.15rem] leading-tight text-cream-lit">
          {current?.title ?? "—"}
        </p>
        <p className="truncate text-[0.8rem] text-cream-lit/60">
          {current ? `${current.artist} • ${current.year}` : ""}
        </p>

        {current && (
          <p className="chip-label mt-1 text-gold/70">
            {bucketLabels[current.buckets[0]]} · Auto reverse · FM/AM
          </p>
        )}

        {/* Errors replace the metadata line, because both answer "what is on?". */}
        {note && (
          <p className="mt-1 text-[0.72rem] leading-snug text-gold" role="status" aria-live="polite">
            {note}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <DeckKey label="Previous song" onClick={radio.previous} disabled={disabled}>
            ⏮
          </DeckKey>
          <button
            type="button"
            onClick={isPlaying ? radio.pause : radio.play}
            disabled={disabled}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="deck-play"
          >
            <span aria-hidden>{isPlaying ? "▮▮" : "▶"}</span>
          </button>
          <DeckKey label="Next song" onClick={radio.next} disabled={disabled}>
            ⏭
          </DeckKey>
        </div>
      </div>

      {/* Right: the volume knob, the one control a deck like this really has. */}
      <div className="deck-knob">
        <p className="chip-label">Volume</p>
        <Knob
          value={radio.volume}
          onChange={radio.setLevel}
          disabled={disabled}
          label="Music volume"
        />
        <div className="flex w-full items-center justify-between px-1">
          <span aria-hidden className="text-cream-lit/40">
            −
          </span>
          <span aria-hidden className="text-cream-lit/40">
            +
          </span>
        </div>
      </div>
    </section>
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
      <span aria-hidden>{children}</span>
    </button>
  );
}
