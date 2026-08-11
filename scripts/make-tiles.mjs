#!/usr/bin/env node
/**
 * Builds seamlessly tileable versions of the still-mood plates.
 *
 *   node scripts/make-tiles.mjs
 *
 * Golden Hour and Last Local have no video by design (§3), so their motion has
 * to come from code. Panning a single image only has as much travel as the image
 * has spare width, which is nowhere near enough to read as a moving train.
 *
 * A tile of [image | mirrored image] repeats without a visible seam: at every
 * junction the same column of pixels meets itself. That gives an endless ribbon
 * to scroll in one direction at constant speed, which is what actually sells
 * travel. Some scenery is mirrored — at window scale and travel speed nobody
 * reads architecture closely enough for that to register.
 */
import path from "node:path";

import { PUBLIC_DIR, ROOT, assertNonEmpty, ffmpeg, humanSize } from "./lib.mjs";

const STILLS = ["golden-hour", "night"];

for (const name of STILLS) {
  const src = path.join(PUBLIC_DIR, "environment", `${name}.webp`);
  const out = path.join(PUBLIC_DIR, "environment", `${name}-tile.webp`);

  ffmpeg([
    "-y",
    "-i", src,
    "-filter_complex",
    "[0]split[a][b];[b]hflip[bf];[a][bf]hstack=inputs=2[out]",
    "-map", "[out]",
    "-c:v", "libwebp",
    "-quality", "88",
    out,
  ]);

  assertNonEmpty(out, 8192);
  console.log(`${name.padEnd(12)} -> ${path.basename(out)}  ${humanSize(out)}`);
}

console.log(`\ntiles in ${path.relative(ROOT, path.join(PUBLIC_DIR, "environment"))}`);
