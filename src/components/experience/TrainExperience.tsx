"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import { WINDOW_BOTTOM, WINDOW_RECT, rectToStyle } from "@/lib/geometry";
import { type Station } from "@/data/stations";
import { moodOrder, moods, type MoodId } from "@/data/moods";
import { EnvironmentMedia } from "./EnvironmentMedia";
import { BoardTrain } from "./BoardTrain";
import { ArrivalBoard } from "./ArrivalBoard";
import { useJourney, type Phase } from "./useJourney";
import { EntertainmentUnit } from "@/components/music/EntertainmentUnit";
import { useRadio } from "@/components/music/useRadio";
import { useAmbience } from "@/components/ambience/useAmbience";

/**
 * Position of the baked-in fan, measured off the master image as a percentage
 * of the plate. Blade disc only, not the cage.
 */
const FAN = { left: 88, top: 4.5, width: 9.5 } as const;

export type FanSpeed = "off" | "slow" | "normal";

export function TrainExperience() {
  const [moodId, setMoodId] = useState<MoodId>("monsoon");
  const [boarded, setBoarded] = useState(false);
  const [focus, setFocus] = useState(false);
  const [fanSpeed, setFanSpeed] = useState<FanSpeed>("normal");

  const mood = moods[moodId];
  const journey = useJourney({ running: boarded });
  const radio = useRadio({ boarded });
  const ambience = useAmbience({
    boarded,
    phase: journey.phase,
    raining: mood.rain,
  });

  // Music ducks under the station announcement rather than pausing (§9).
  const { duck } = radio;
  useEffect(() => {
    duck(journey.atStation);
  }, [duck, journey.atStation]);

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden bg-ink"
      style={
        {
          "--window-bottom": `${WINDOW_BOTTOM}%`,
          "--wash": mood.wash,
          "--wash-strength": mood.washStrength,
          "--dim": mood.dim,
        } as CSSProperties
      }
    >
      {/*
        Only the carriage imagery vibrates — not the coded chrome.
        Physically the panels are bolted to the carriage and would shake too, but
        at 1px the difference is invisible, while shaking the whole tree would
        transform-animate every control and the YouTube iframe forever.
      */}
      <div
        className="carriage-shake absolute inset-0"
        style={{ "--shake": journey.moving ? "1px" : "0px" } as CSSProperties}
      >
        <div className="plate">
          <Image
            src="/agla-station/interior/train-interior-master.webp"
            alt="Inside a Mumbai suburban local train carriage"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />

          <TrainWindow
            moodId={moodId}
            speed={journey.speed}
            station={journey.station}
            boardVisible={journey.boardVisible}
          />
          <FanBlur speed={fanSpeed} />
          <Handles moving={journey.moving} />
        </div>

        {/* Portrait runs out of photograph long before it runs out of screen, so
            the carriage wall continues in CSS below the plate. */}
        <div className="portrait-wall" aria-hidden />
      </div>

      {/* Grades the metal and the view together, so a mood change reads as the
          light in the carriage changing rather than just the window. */}
      <div className="wash" aria-hidden />
      <div className="dim" aria-hidden />

      {/* Chrome lives in viewport coordinates, not plate coordinates, so it
          stays on screen when the plate overflows on wide displays. */}
      {/* Focus mode strips the carriage back to scenery, audio and the player
          (§7.3). The chrome fades rather than unmounting, so nothing reflows. */}
      <div className={`chrome-layer ${focus ? "is-hidden" : ""}`} inert={focus}>
        <Header />
      </div>

      <LowerCarriage
        station={journey.station}
        phase={journey.phase}
        index={journey.index}
        total={journey.total}
        radio={radio}
        ambience={ambience}
        moodId={moodId}
        onMoodChange={setMoodId}
        focus={focus}
        onFocusChange={setFocus}
        fanSpeed={fanSpeed}
        onFanChange={setFanSpeed}
      />

      {!boarded && <BoardTrain onBoard={() => setBoarded(true)} />}
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function TrainWindow({
  moodId,
  speed,
  station,
  boardVisible,
}: {
  moodId: MoodId;
  speed: number;
  station: Station;
  boardVisible: boolean;
}) {
  return (
    <div
      className={`absolute overflow-hidden rounded-[10px] ${speed === 0 ? "is-halted" : ""}`}
      style={{
        ...rectToStyle(WINDOW_RECT),
        // Seats the media into the depicted steel frame and swallows any
        // hairline of the grey aperture at the edges.
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,.5), inset 0 16px 34px -12px rgba(0,0,0,.8), inset 0 -12px 26px -14px rgba(0,0,0,.65)",
      }}
    >
      {/* All three stay mounted and crossfade on opacity. Swapping the source
          instead would restart the video and flash its poster (§7.2 — no
          hard cuts between moods). */}
      {moodOrder.map((id) => (
        <EnvironmentMedia
          key={id}
          mood={moods[id]}
          active={id === moodId}
          speed={id === moodId ? speed : 0}
        />
      ))}

      <ArrivalBoard station={station} visible={boardVisible} />

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: moods[moodId].rain ? 1 : 0 }}
      >
        <Rain />
      </div>

      {/* Glass: one weak vertical reflection, condensation gathering in a
          corner. Screen-blended so it lifts the plate rather than greying it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-screen"
        style={{
          background:
            "linear-gradient(104deg, transparent 33%, rgba(255,255,255,.85) 45%, transparent 53%), radial-gradient(55% 38% at 100% 100%, rgba(255,255,255,.55), transparent 72%)",
        }}
      />
    </div>
  );
}

/**
 * Rain seen through the glass. Two gradient sheets at different scales and
 * speeds read as depth; a canvas particle system would cost more and look no
 * better at this opacity (§7.3 — do not spend Veo money on a rain overlay).
 */
function Rain() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen">
      <div className="rain-sheet rain-sheet--near" />
      <div className="rain-sheet rain-sheet--far" />
    </div>
  );
}

/**
 * A fan spinning at speed does not photograph as blades — it photographs as a
 * translucent disc with faint radial streaks. So the baked-in blades stay put
 * and this disc spins over them. Off means not rendering it at all, which
 * reveals the sharp blades underneath.
 */
function FanBlur({ speed }: { speed: FanSpeed }) {
  if (speed === "off") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        left: `${FAN.left}%`,
        top: `${FAN.top}%`,
        width: `${FAN.width}%`,
        aspectRatio: "1",
        animation: `fan-spin ${speed === "slow" ? "1.5s" : "0.42s"} linear infinite`,
        background:
          "conic-gradient(from 0deg, rgba(28,26,22,.46) 0deg 26deg, rgba(120,118,110,.12) 26deg 90deg, rgba(28,26,22,.46) 90deg 116deg, rgba(120,118,110,.12) 116deg 180deg, rgba(28,26,22,.46) 180deg 206deg, rgba(120,118,110,.12) 206deg 270deg, rgba(28,26,22,.46) 270deg 296deg, rgba(120,118,110,.12) 296deg 360deg)",
        filter: "blur(2.5px)",
        maskImage: "radial-gradient(circle, #000 62%, transparent 78%)",
      }}
    />
  );
}

/**
 * Hanging grips. The master photograph has none and v3 dropped the isolated
 * prop assets, so these are drawn — dark silhouettes hanging off the luggage
 * rail, where a photograph would give little detail anyway.
 *
 * Deliberately only two, both clear of the window: a grip swinging across the
 * glass competes with the one thing the scene exists to show.
 */
function Handles({ moving }: { moving: boolean }) {
  const grips = [
    { left: 11, delay: "0s" },
    { left: 80, delay: "-1.3s" },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
      {grips.map((g) => (
        <svg
          key={g.left}
          viewBox="0 0 40 150"
          style={{
            position: "absolute",
            left: `${g.left}%`,
            top: "-0.5%",
            width: "3.2%",
            transformOrigin: "top center",
            animation: moving
              ? `handle-sway 3.1s ease-in-out ${g.delay} infinite`
              : undefined,
            filter: "blur(0.6px)",
          }}
        >
          {/* strap */}
          <rect x="15.5" y="0" width="9" height="84" rx="2" fill="rgba(20,17,14,.6)" />
          {/* grip loop — squat and rounded, the way a worn plastic grip reads */}
          <ellipse
            cx="20"
            cy="110"
            rx="16"
            ry="22"
            fill="none"
            stroke="rgba(20,17,14,.66)"
            strokeWidth="9"
          />
        </svg>
      ))}
    </div>
  );
}

/**
 * The wordmark rides on a riveted enamel plate rather than being painted
 * straight onto the photograph: the top of the carriage is dark steel, and
 * multiply-blended type disappears into it.
 *
 * One line only. In portrait the window starts ~41px down, so a two-line plate
 * would sit over the glass — and the line name belongs beside the station name
 * anyway, not beside the logo.
 */
function Header() {
  return (
    <header className="absolute left-3 top-3">
      <div className="mat-cream edge-machined relative rounded-xs py-1.5 pl-3 pr-8">
        <span className="bolt absolute right-2 top-1/2 -translate-y-1/2" />
        <p className="t-signage text-[1.1rem] tracking-wider text-ink">Agla Station</p>
      </div>
    </header>
  );
}

/**
 * Mood selector, styled as three worn selector tabs on a riveted plate rather
 * than app-style pills. Real radios, so arrow keys work and the current mood is
 * announced rather than merely looking different.
 */
function MoodSwitch({
  moodId,
  onChange,
}: {
  moodId: MoodId;
  onChange: (id: MoodId) => void;
}) {
  return (
    <div className="mood-switch">
      <fieldset className="mat-cream edge-machined relative rounded-xs px-2 py-1.5">
        <legend className="sr-only">Mood</legend>
        <div className="flex items-stretch gap-1">
          {moodOrder.map((id) => {
            const m = moods[id];
            const on = id === moodId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(id)}
                className={`flex-1 rounded-[1px] px-2.5 py-1 text-left transition-colors ${
                  on ? "bg-ink/85" : "bg-ink/5 hover:bg-ink/15"
                }`}
              >
                <span
                  className={`t-label block whitespace-nowrap ${
                    on ? "text-cream-lit" : "text-ink/60"
                  }`}
                >
                  {m.label}
                </span>
                <span
                  className={`mood-sublabel t-dev-inline block text-[0.68rem] leading-tight ${
                    on ? "text-cream-lit/70" : "text-ink/40"
                  }`}
                >
                  {m.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function LowerCarriage({
  station,
  phase,
  index,
  total,
  radio,
  ambience,
  moodId,
  onMoodChange,
  focus,
  onFocusChange,
  fanSpeed,
  onFanChange,
}: {
  station: Station;
  phase: Phase;
  index: number;
  total: number;
  radio: ReturnType<typeof useRadio>;
  ambience: ReturnType<typeof useAmbience>;
  moodId: MoodId;
  onMoodChange: (id: MoodId) => void;
  focus: boolean;
  onFocusChange: (v: boolean) => void;
  fanSpeed: FanSpeed;
  onFanChange: (v: FanSpeed) => void;
}) {
  const atStation = phase === "arriving" || phase === "stopped";

  return (
    <div className="lower flex items-end justify-between gap-5 px-4 pb-4">
      <EntertainmentUnit
        radio={radio}
        ambience={ambience}
        focus={focus}
        onFocusChange={onFocusChange}
      />

      {/* Persistent journey state. Distinct from the arrival board that slides
          through the window: this says where you are going, not where you are. */}
      <div
        className={`chrome-layer flex min-w-0 flex-col items-end gap-2 ${
          focus ? "is-hidden" : ""
        }`}
        inert={focus}
      >
        <section className="signage-plate mat-cream edge-machined w-fit max-w-full rounded-[3px] px-4 py-3">
          <div className="flex items-baseline gap-2.5">
            <p className="t-label text-ink/55">Western Line</p>
            <span aria-hidden className="h-px flex-1 bg-ink/20" />
            {/* The label has to change with the train: "next" is wrong while
                you are standing at the platform. */}
            <p className="t-label whitespace-nowrap text-ink/45">
              {atStation ? "This Station" : "Next Station"}
            </p>
          </div>
          <p className="t-devanagari mt-0.5 text-[1.45rem] leading-tight text-ink">
            {station.marathi}
          </p>
          {/* Most Mumbai names are spelled identically in both scripts. Printing
              the same word twice is noise, not trilingual signage. */}
          {station.hindi !== station.marathi && (
            <p className="t-devanagari text-[1.05rem] leading-tight text-ink/65">
              {station.hindi}
            </p>
          )}
          <div className="mt-1 flex items-baseline gap-5">
            <p className="t-signage text-[1.6rem] text-ink">{station.english}</p>
            <p className="t-ticket ml-auto text-ink/55">
              {String(index + 1).padStart(2, "0")} / {total}
            </p>
          </div>
        </section>

        <CarriageControls fanSpeed={fanSpeed} onFanChange={onFanChange} />

        {/* Last in the DOM on purpose. `.lower` is column-reverse in portrait, so
            this lands at the top of the stack — in the empty wall below the glass,
            instead of covering the window as it did when pinned top-right. */}
        <MoodSwitch moodId={moodId} onChange={onMoodChange} />
      </div>
    </div>
  );
}

/** Fan speed, the one physical fitting a passenger can actually reach. */
function CarriageControls({
  fanSpeed,
  onFanChange,
}: {
  fanSpeed: FanSpeed;
  onFanChange: (v: FanSpeed) => void;
}) {
  const order: FanSpeed[] = ["off", "slow", "normal"];
  return (
    <button
      type="button"
      onClick={() => onFanChange(order[(order.indexOf(fanSpeed) + 1) % order.length])}
      className="push-key px-3"
      aria-label={`Fan: ${fanSpeed}. Change speed`}
    >
      Fan · {fanSpeed}
    </button>
  );
}

