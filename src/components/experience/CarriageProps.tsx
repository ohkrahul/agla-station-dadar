"use client";

/**
 * The things actually stuck to the wall of a Mumbai local: the bilingual door
 * warning, a plaque, a sticker, and somebody's handwritten note.
 *
 * They sit on the right-hand wall, which the photograph leaves free. Decoration
 * in the sense that they carry no state — but they are the details that make the
 * carriage feel used rather than rendered, and they are all real signage.
 */
export function CarriageProps() {
  return (
    <div className="carriage-props" aria-hidden>
      <div className="prop-plaque">
        <p>Life line</p>
        <p className="text-[0.62rem] opacity-70">of Mumbai</p>
      </div>

      {/* Yellow enamel warning, in Marathi over English as the real ones are. */}
      <div className="prop-warning">
        <p className="t-dev-inline text-[0.6rem] leading-tight">
          कृपया दरवाजाजवळ उभे राहू नका
        </p>
        <p className="mt-1 text-[0.62rem] font-semibold leading-tight tracking-wider">
          PLEASE DO NOT
          <br />
          STAND NEAR DOOR
        </p>
      </div>

      <div className="prop-sticker">
        <p className="text-[0.7rem] leading-none">I</p>
        <p className="text-[0.85rem] leading-none text-[#c0392b]">♥</p>
        <p className="t-dev-inline text-[0.8rem] leading-none">मुंबई</p>
      </div>

      {/* Somebody wrote this on the wall: the journey is the destination. */}
      <div className="prop-note">
        <p>Kabhi kabhi</p>
        <p>safar hi</p>
        <p>manzil hota hai.</p>
        <p className="mt-1 text-right text-[0.8rem] opacity-60">☺</p>
      </div>
    </div>
  );
}
