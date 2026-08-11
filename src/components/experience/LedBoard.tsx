"use client";

import type { Station } from "@/data/stations";

/**
 * The dot-matrix indicator above the glass.
 *
 * A real Mumbai indicator cycles the same name through three scripts, which is
 * why the name appears as Marathi · English · Hindi rather than stacked. All of
 * it is live text, never baked into an asset (§9), which is what makes it
 * legible at any size and translatable at all.
 */
export function LedBoard({ station, atStation }: { station: Station; atStation: boolean }) {
  return (
    <div className="led-board" role="status" aria-live="polite">
      <p className="led-text px-3 pt-1.5 text-center text-[0.6rem] opacity-80">
        अगला स्टेशन / {atStation ? "This Station" : "Next Station"}
      </p>
      <div className="led-row">
        <span className="led-text t-dev-inline led-script">{station.marathi}</span>
        <span className="led-text led-latin font-semibold">{station.english}</span>
        {/* Third copy is dropped on narrow screens: for most Mumbai names it is
            identical to the Marathi, and it is what forced the board to wrap. */}
        <span className="led-text t-dev-inline led-script led-hindi">{station.hindi}</span>
      </div>
    </div>
  );
}
