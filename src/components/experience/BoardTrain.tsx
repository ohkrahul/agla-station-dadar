"use client";

/**
 * The one gesture before anything makes sound (§6, §10).
 *
 * Browsers block audible autoplay, and starting music unannounced is hostile
 * anyway. This is deliberately not a tutorial or a cookie wall: one button, and
 * it says exactly what happens when you press it.
 */
export function BoardTrain({ onBoard }: { onBoard: () => void }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink/55 backdrop-blur-[2px]">
      <div className="mat-cream edge-machined relative max-w-[min(24rem,88vw)] rounded-sm px-7 py-6 text-center">
        <span className="bolt absolute left-2 top-2" />
        <span className="bolt absolute right-2 top-2" />

        <p className="t-signage text-[1.9rem] leading-none text-ink">Agla Station</p>
        <p className="t-dev-inline mt-1 text-[1.05rem] text-ink/70">आगला स्टेशन</p>
        <p className="t-label mt-3 text-ink/55">Western Line · Mumbai Local Radio</p>

        <button
          type="button"
          onClick={onBoard}
          autoFocus
          className="push-key mt-5 w-full py-2.5 text-[0.95rem]"
        >
          Board train
        </button>

        {/* Says what the press does, rather than selling the experience. */}
        <p className="t-label mt-3 leading-relaxed text-ink/45">
          Starts the journey, the ambience and the radio
        </p>
      </div>
    </div>
  );
}
