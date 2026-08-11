"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { WINDOW_BOTTOM, WINDOW_RECT, rectToStyle } from "@/lib/geometry";
import { LINE_NAME, terminus, type Station } from "@/data/stations";
import { moodOrder, moods, type MoodId } from "@/data/moods";
import type { SongBucket } from "@/data/songs";
import { EnvironmentMedia } from "./EnvironmentMedia";
import { BoardTrain } from "./BoardTrain";
import { ArrivalBoard } from "./ArrivalBoard";
import { RouteRail } from "./RouteRail";
import { TopBar } from "./TopBar";
import { CarriageProps } from "./CarriageProps";
import { ControlRail } from "./SidePanels";
import { useJourney } from "./useJourney";
import { PlayerDeck, HiddenPlayer } from "@/components/music/PlayerDeck";
import { useRadio } from "@/components/music/useRadio";
import { useAmbience } from "@/components/ambience/useAmbience";

/**
 * Position of the baked-in fan, measured off the master image as a percentage
 * of the plate. Blade disc only, not the cage.
 */
const FAN = { left: 88, top: 4.5, width: 9.5 } as const;

export type FanSpeed = "off" | "slow" | "normal";

/** Playlist filters offered by the bottom bar, plus "everything". */
const BUCKETS: (SongBucket | null)[] = [null, "90s", "2000s", "monsoon", "last-local"];

export function TrainExperience() {
  const [moodId, setMoodId] = useState<MoodId>("monsoon");
  const [boarded, setBoarded] = useState(false);
  const [focus, setFocus] = useState(false);
  const [fanSpeed, setFanSpeed] = useState<FanSpeed>("normal");
  const [bucketIndex, setBucketIndex] = useState(0);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const bucket = BUCKETS[bucketIndex];
  const mood = moods[moodId];
  const journey = useJourney({ running: boarded });
  const radio = useRadio({ boarded, bucket });
  const ambience = useAmbience({
    boarded,
    phase: journey.phase,
    raining: mood.rain,
  });

  // Music ducks under the door cue at a stop rather than pausing (§9).
  const { duck } = radio;
  useEffect(() => {
    duck(journey.atStation);
  }, [duck, journey.atStation]);

  const share = useCallback(async () => {
    const text = `AGLA STATION — ${LINE_NAME}, heading for ${terminus.english}. At ${
      journey.station.english
    }, ${mood.label}${radio.current ? `, listening to ${radio.current.title}` : ""}.`;
    try {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      setShareNote("Copied");
    } catch {
      // Clipboard is blocked in some contexts; say so rather than failing mute.
      setShareNote("Copy blocked");
    }
    setTimeout(() => setShareNote(null), 2200);
  }, [journey.station.english, mood.label, radio.current]);

  const shake = journey.moving ? "1px" : "0px";

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden bg-ink"
      style={
        {
          /* Where the glass ends, so panels can be anchored clear of it. */
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
        at 1–2px the difference is invisible, while shaking the whole tree would
        transform-animate every control and the YouTube iframe forever.
      */}
      <div
        className="carriage-shake absolute inset-0"
        style={{ "--shake": shake } as CSSProperties}
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

        <div className="portrait-wall" aria-hidden />
      </div>

      {/* Grades the metal and the view together, so a mood change reads as the
          light in the carriage changing rather than just the window. */}
      <div className="wash" aria-hidden />
      <div className="dim" aria-hidden />

      {/* Focus mode strips the carriage back to scenery, audio and the player
          (§7.3). Chrome fades rather than unmounting, so nothing reflows. */}
      <div className={`chrome-layer ${focus ? "is-hidden" : ""}`} inert={focus}>
        <div className="top-mount">
          <TopBar
            station={journey.station}
            atStation={journey.atStation}
            moodId={moodId}
            ambienceLevel={Math.round(ambience.volume * 100)}
            onAmbienceChange={(v) => ambience.setVolume(v / 100)}
            ambienceAvailable={ambience.available !== false}
          />
        </div>

        <div className="rail-mount">
          <RouteRail
            index={journey.index}
            atStation={journey.atStation}
            onJumpTo={journey.jumpTo}
          />
        </div>

        {/* Under the route rail, on the left: the right-hand wall now carries the
            control rail, and the two together would not fit there. */}
        <CarriageProps />

        {/* The mirror of the route rail — controls read top to bottom under the
            fan, which also leaves the band below the glass to the deck alone. */}
        <div className="control-mount">
          <ControlRail
            moodId={moodId}
            onMood={setMoodId}
            bucket={bucket}
            onCycleBucket={() => setBucketIndex((i) => (i + 1) % BUCKETS.length)}
            focus={focus}
            onFocus={setFocus}
            fanSpeed={fanSpeed}
            onFan={setFanSpeed}
            onShare={share}
            shareNote={shareNote}
          />
        </div>
      </div>

      {/*
        The band below the glass holds the deck and nothing else. Its height is
        set by the player's 200px floor (§6), and the carriage only leaves about
        260px of wall there — which is why the controls moved to the right rail
        rather than sharing this row.
      */}
      <div className="console-mount">
        <PlayerDeck radio={radio} />

        {/* Focus mode hides the rail, so the way back out lives here. */}
        {focus && (
          <button
            type="button"
            onClick={() => setFocus(false)}
            className="share-key self-center"
          >
            Show controls
          </button>
        )}
      </div>

      {/* Audio source, mounted out of sight. Must stay in the layout to play. */}
      <HiddenPlayer radio={radio} />

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
      className={`window-box ${speed === 0 ? "is-halted" : ""}`}
      style={{
        ...rectToStyle(WINDOW_RECT),
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,.5), inset 0 16px 34px -12px rgba(0,0,0,.8), inset 0 -12px 26px -14px rgba(0,0,0,.65)",
      }}
    >
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
          <rect x="15.5" y="0" width="9" height="84" rx="2" fill="rgba(20,17,14,.6)" />
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
