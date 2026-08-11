"use client";

import { bucketLabels } from "@/data/songs";
import type { useAmbience } from "@/components/ambience/useAmbience";
import type { useRadio } from "./useRadio";

type Radio = ReturnType<typeof useRadio>;
type Ambience = ReturnType<typeof useAmbience>;

/**
 * The player, mounted as a screen set into the carriage wall.
 *
 * §6 is a hard constraint, not a style choice: the iframe stays visible,
 * uncropped, never below 200x200, and NOTHING is drawn on top of it. All of the
 * physical character therefore lives in the bezel, the bolts and the engraved
 * plate AROUND the rectangle. Do not add a texture, gradient, scanline or
 * clickable overlay inside `.player-screen`.
 */
export function EntertainmentUnit({
  radio,
  ambience,
  focus,
  onFocusChange,
}: {
  radio: Radio;
  ambience: Ambience;
  focus: boolean;
  onFocusChange: (v: boolean) => void;
}) {
  const { current, status, note, index, total } = radio;

  return (
    <section className="entertainment-unit mat-steel edge-machined relative w-fit shrink-0 rounded-[5px] p-2">
      <Bolts />

      <div className="player-screen relative bg-black/90">
        {/* YouTube replaces this node with its iframe. Keep it empty. */}
        <div ref={radio.mountRef} className="h-full w-full" />

        {status === "off" && (
          <p className="t-label absolute inset-0 grid place-items-center text-steel-lit/40">
            Unit off
          </p>
        )}
      </div>

      {/* Beside the screen, not below it: stacked underneath, the unit grew
          taller than the panel below the window and rode up over the glass. */}
      <div className="unit-console flex min-w-0 flex-col justify-between gap-1.5">
        <div className="unit-head">
          <div className="flex items-baseline justify-between gap-2">
            <p className="t-label engraved whitespace-nowrap">Entertainment Unit</p>
            {total > 0 && (
              <p className="t-ticket whitespace-nowrap text-steel-dark/80">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </p>
            )}
          </div>
          {/* Which shelf of the playlist this came off — real information, and it
              keeps the column from reading as empty metal. */}
          {current && status !== "off" && (
            <p className="t-label mt-0.5 text-cream/60">
              {bucketLabels[current.buckets[0]]}
            </p>
          )}
        </div>

        {/* Now-playing and failure share one line: both answer "what is on?". */}
        <p
          className="unit-now t-label min-h-[1.1rem] leading-relaxed text-cream/85"
          role="status"
          aria-live="polite"
        >
          {note ??
            (current && status !== "off"
              ? `${current.title} · ${current.artist} · ${current.year}`
              : "")}
        </p>

        <Transport radio={radio} />
        <Mixer radio={radio} ambience={ambience} />

        {/* Stays reachable in focus mode — it is the way back out. */}
        <button
          type="button"
          onClick={() => onFocusChange(!focus)}
          className="unit-focus push-key w-full"
          aria-pressed={focus}
        >
          {focus ? "Show controls" : "Focus"}
        </button>
      </div>
    </section>
  );
}

/**
 * Two faders, because music and ambience are independent layers and the v1
 * definition of done requires them to be independently controllable.
 */
function Mixer({ radio, ambience }: { radio: Radio; ambience: Ambience }) {
  const noAudio = ambience.available === false;

  return (
    <div className="unit-mixer flex flex-col gap-1">
      <Fader
        label="Music"
        value={radio.volume}
        onChange={radio.setLevel}
        disabled={radio.status === "off" || radio.status === "unavailable"}
      />
      <Fader
        label={noAudio ? "No amb." : "Amb."}
        value={Math.round(ambience.volume * 100)}
        onChange={(v) => ambience.setVolume(v / 100)}
        disabled={noAudio || ambience.available === null}
      />
    </div>
  );
}

function Fader({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="t-label engraved w-11 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="volume-slider w-full min-w-12"
        aria-label={`${label} volume`}
      />
    </label>
  );
}

function Transport({ radio }: { radio: Radio }) {
  const { status, play, pause, next, previous } = radio;
  const isPlaying = status === "playing";
  const disabled = status === "off" || status === "unavailable";

  return (
    <div className="unit-transport flex items-center gap-1.5">
      <Key label="Previous song" onClick={previous} disabled={disabled}>
        ◀◀
      </Key>
      <Key
        label={isPlaying ? "Pause" : "Play"}
        onClick={isPlaying ? pause : play}
        disabled={disabled}
        wide
      >
        {isPlaying ? "▮▮" : "▶"}
      </Key>
      <Key label="Next song" onClick={next} disabled={disabled}>
        ▶▶
      </Key>
    </div>
  );
}

/** A chunky railway pushbutton: brass-ish face, hard shadow, real travel. */
function Key({
  children,
  label,
  onClick,
  disabled,
  wide,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`push-key ${wide ? "px-4" : "px-2.5"}`}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

function Bolts() {
  return (
    <div aria-hidden>
      <span className="bolt absolute left-1 top-1" />
      <span className="bolt absolute right-1 top-1" />
      <span className="bolt absolute bottom-1 left-1" />
      <span className="bolt absolute bottom-1 right-1" />
    </div>
  );
}
