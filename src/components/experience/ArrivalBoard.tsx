"use client";

import type { Station } from "@/data/stations";

/**
 * The signature moment.
 *
 * A real Mumbai platform board carries three scripts stacked — Marathi, Hindi,
 * English — on painted railway yellow. As the train pulls in, the board travels
 * in from the right, decelerates and settles, exactly as it would past your seat.
 *
 * It lives INSIDE the window, so it reads as a physical object out on the
 * platform rather than as a UI toast over the scene. The text is real HTML, never
 * baked into an asset (§9), which is what lets it be trilingual and legible.
 */
export function ArrivalBoard({ station, visible }: { station: Station; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      // Announced once it has settled, not while it is still sliding.
      aria-live="polite"
      aria-atomic
    >
      <div className={`arrival-board ${visible ? "is-in" : ""}`}>
        <div className="board-plate">
          <p className="t-devanagari board-script">{station.marathi}</p>
          {station.hindi !== station.marathi && (
            <p className="t-devanagari board-script board-script--sub">{station.hindi}</p>
          )}
          <p className="t-signage board-latin">{station.english}</p>
        </div>
        {/* The post it hangs from, cropped by the window like the real thing. */}
        <div className="board-post" aria-hidden />
      </div>
    </div>
  );
}
