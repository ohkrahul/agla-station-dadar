"use client";

/**
 * The things actually stuck to the wall of a Mumbai local.
 *
 * Two, not four. Both rails are occupied now, and the strip of wall left under
 * the route could not hold a plaque and a sticker as well without clipping them
 * — and a clipped sticker looks like a bug, not like a carriage. These two carry
 * the most: real bilingual signage, and somebody's handwriting.
 */
export function CarriageProps() {
  return (
    <div className="carriage-props" aria-hidden>
      {/* Yellow enamel warning, in Marathi over English as the real ones are. */}
      <div className="prop-warning">
        <p className="t-dev-inline text-[0.6rem] leading-tight">
          कृपया दरवाजाजवळ उभे राहू नका
        </p>
        <p className="mt-1 text-[0.62rem] font-semibold leading-tight tracking-wider">
          PLEASE DO NOT STAND NEAR DOOR
        </p>
      </div>

      {/* Somebody wrote this on the wall: the journey is the destination. */}
      <div className="prop-note">
        <p>Kabhi kabhi safar hi</p>
        <p>manzil hota hai.</p>
      </div>
    </div>
  );
}
