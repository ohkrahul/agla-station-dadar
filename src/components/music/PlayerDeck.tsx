"use client";

import { bucketLabels } from "@/data/songs";
import type { useRadio } from "./useRadio";
import { Knob } from "./Knob";

type Radio = ReturnType<typeof useRadio>;

/**
 * The deck: cover art, what is playing, transport, volume.
 *
 * The YouTube player itself is NOT here — it is mounted hidden by
 * <HiddenPlayer/> and this shows the video's thumbnail in its place. That is a
 * deliberate choice by the project owner, and it is worth being clear about the
 * trade in code as well as in conversation: YouTube's Required Minimum
 * Functionality expects an embedded player to stay visible, so a hidden one can
 * have embedding revoked for the domain. If playback ever starts failing across
 * every track at once, this is the first thing to suspect — make the mount
 * visible again and the deck falls back to a compliant 200x200 player.
 */
export function PlayerDeck({ radio }: { radio: Radio }) {
  const { current, status, note, index, total } = radio;
  const isPlaying = status === "playing";
  const disabled = status === "off" || status === "unavailable";

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
        {/* Classed rather than inlined so the short-viewport rules can drop the
            secondary rows: on a 610px-tall window there is only room for the
            title and the transport. */}
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

        <div className="deck-transport mt-1.5 flex items-center gap-2">
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
      <span aria-hidden>{children}</span>
    </button>
  );
}
