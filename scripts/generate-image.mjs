#!/usr/bin/env node
/**
 * AGLA STATION still generation. Development only (playbook §10 — no Gemini
 * call ever happens from a visitor).
 *
 *   node scripts/generate-image.mjs interior
 *   node scripts/generate-image.mjs interior --model gemini-3.1-flash-image --size 2K
 *   node scripts/generate-image.mjs monsoon-ref --dry-run
 *
 * Prompts below are copied verbatim from playbook §4.1–4.5. They are tuned,
 * and the trailing IMPORTANT: clauses are what keep generated text, logos and
 * metro styling out of the assets. Edit them only on purpose.
 */
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

import {
  PUBLIC_DIR,
  RAW_DIR,
  ROOT,
  ensureDir,
  humanSize,
  loadEnv,
  parseArgs,
  requireApiKey,
  stamp,
  toWebp,
} from "./lib.mjs";

const DEFAULT_MODEL = "gemini-3.1-flash-lite-image";
const DEFAULT_SIZE = "1K";
const ASPECT = "16:9";

/** Reference price per still, for the pre-flight line (§2). */
const PRICE_PER_IMAGE = { "gemini-3.1-flash-lite-image": 0.0336, "gemini-3.1-flash-image": 0.06 };

/**
 * Appended to every outside-the-window prompt.
 *
 * The §4 prompts say "passenger-window height", and Flash Lite still returns
 * an elevated, looking-down-at-the-rooftops view — which animates like a drone
 * shot and destroys the illusion of sitting in a local. This is §5's own
 * cost-control step 2 (fix composition with a cheap still, not a paid video).
 * The framing sentence about cropped rails is what actually forces eye level;
 * "eye height" alone does not. Wording follows the stricter camera language in
 * the earlier v1 playbook §8.
 */
const CAMERA_LOCK = ` CAMERA HEIGHT IS CRITICAL: the camera sits exactly at seated passenger eye level inside a train carriage, a little over a metre and a half above the rails, looking horizontally straight across the scene. It is not elevated, not tilted down, and not on a bridge, roof, drone or embankment. The horizon line sits near the vertical middle of the frame. The nearest rails are cut off by the bottom edge of the frame rather than laid out below the viewer, and building façades rise above the horizon rather than being seen from above. CAMERA DIRECTION IS EQUALLY CRITICAL: the view is exactly perpendicular to the direction of travel, as if looking straight out of a side window. Every railway track, platform edge and wall runs HORIZONTALLY across the frame from the left edge to the right edge, staying roughly parallel to the bottom of the frame. Do not look along the railway line. There must be no vanishing point, no tracks receding into the distance, no tracks converging toward a point, and no curve sweeping away from the viewer.`;

/**
 * Appended to the interior prompt only.
 *
 * §4.1 asks for a window at ~60% of composition width; Flash Lite returned one
 * at ~37%, with blown-out baked scenery inside the glass. Both matter: the
 * window is the emotional payload, and because the environment video is
 * positioned OVER the depicted aperture rather than behind a cut-out, a bright
 * baked sky leaks at the edges if the rectangle is a pixel off. Asking for a
 * flat neutral field inside the glass makes any such seam invisible.
 */
const WINDOW_LOCK = ` WINDOW SIZE IS CRITICAL: the window aperture must be large and dominant — its glass area spans at least 60 percent of the total image width and at least 45 percent of the total image height, centred horizontally. Do not render a small window surrounded by large areas of wall. INSIDE THE GLASS: show only a flat, empty, evenly lit neutral mid-grey field. No scenery, no sky, no clouds, no poles, no tracks, no trees, no buildings, no bright blown-out highlights and no detail of any kind beyond the glass, because moving video will be composited over exactly this area.`;

const ASSETS = {
  interior: {
    out: "interior/train-interior-master",
    prompt: `Create a cinematic photorealistic interior of an authentic Mumbai suburban local train carriage, viewed perfectly straight-on from a seated passenger perspective. A very large rectangular railway window dominates the center and occupies roughly 60 percent of the composition width. Keep the window visually clean and neutral so a moving video can later be composited behind it. Surround the window with aged stainless steel and cream-painted metal surfaces with subtle scratches, tiny dents and realistic everyday wear, but do not make the carriage dirty or abandoned. Include a classic Mumbai local blue patterned bench seat only partially visible in the lower-right area and one old circular metal railway fan on the upper-right wall. Leave breathing room beneath and beside the window for code-based interface elements. Authentic Indian suburban railway proportions, tactile physical materials, subtle warm ambient light, slight cinematic grain, premium realistic photography, straight-on symmetrical camera, 16:9. IMPORTANT: no passengers, no people, no readable signs, no advertisements, no logos, no station names, no UI, no buttons, no player, no generated text, no futuristic metro styling, no luxury-train styling.`,
  },
  "monsoon-ref": {
    out: "environment/monsoon-reference",
    prompt: `Create a photorealistic Mumbai suburban railway landscape seen exactly sideways from passenger-window height during monsoon. Multiple wet railway tracks run horizontally across the lower foreground. Include authentic overhead electrical wires, poles and everyday railway infrastructure. Midground: realistic Mumbai residential buildings, old and new apartments, terraces, water tanks, small structures and occasional trees. Background: a hazy dense Mumbai skyline beneath layered grey-blue monsoon clouds. Surfaces are wet with subtle reflections and humid atmospheric haze. Strong depth separation is essential: very close foreground railway elements, middle-distance buildings, distant skyline. This still will become the first frame/reference for an image-to-video generation, so keep architecture coherent and physically believable. Documentary-realistic, natural colors, cinematic Indian photography, 16:9. IMPORTANT: no train interior, no window frame, no raindrops on camera glass, no visible train, no close people, no station board, no text, no logos, no dramatic lightning, no cyberpunk grading.`,
  },
  "golden-hour": {
    out: "environment/golden-hour",
    prompt: `Create a cinematic photorealistic Mumbai suburban railway landscape seen perfectly sideways from passenger-window height during calm golden hour. Railway tracks and overhead electric infrastructure run across the foreground; authentic apartment blocks, terraces, trees and water tanks fill the middle distance; a soft Mumbai skyline sits far behind. The sun is low, producing warm amber-orange light, long subtle shadows and delicate reflections on steel tracks. Humid Mumbai haze softens the distance. Keep the image realistic, ordinary and nostalgic rather than epic. Strong foreground/midground/background depth for code-based parallax. 16:9, natural premium film color. IMPORTANT: no train interior, no window frame, no people close to camera, no readable signage, no logos, no text, no exaggerated sunset, no futuristic city.`,
  },
  night: {
    out: "environment/night",
    prompt: `Create a photorealistic Mumbai suburban railway landscape seen perfectly sideways from passenger-window height at night. Several railway tracks cross the lower foreground with occasional wet metallic reflections. Authentic electrical poles and overhead wires are visible. Middle distance: realistic apartment buildings, railway structures and scattered warm windows. Background: dense but believable Mumbai skyline under a deep navy night sky with humid atmospheric haze. Lighting comes from practical city and railway lights, not neon cyberpunk sources. Rich dark-blue atmosphere but enough detail to remain readable behind a train window. Strong depth separation for parallax animation, cinematic Indian photography, 16:9. IMPORTANT: no train interior, no window frame, no close people, no text, no station signs, no logos, no sci-fi, no excessive neon.`,
  },
  platform: {
    out: "environment/platform",
    prompt: `Create a photorealistic Mumbai suburban railway platform viewed perfectly sideways from inside a stopped local train, but do not include the train window or interior itself. Show authentic platform flooring, pillars, benches, fluorescent practical lighting, overhead railway structure and a few distant commuter silhouettes that are small and non-identifiable. Leave station signage blank or unreadable so the station name can be rendered in code. Everyday Mumbai atmosphere, realistic scale, natural colors, cinematic documentary feel, 16:9. IMPORTANT: no readable text, no logos, no giant crowd, no front-facing portraits, no luxury station, no metro platform doors.`,
  },
};

/** Everything except the interior is a view out of the window. */
for (const [key, a] of Object.entries(ASSETS)) {
  a.prompt += key === "interior" ? WINDOW_LOCK : CAMERA_LOCK;
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const name = positional[0];
const asset = ASSETS[name];

if (!asset) {
  console.error(`Usage: node scripts/generate-image.mjs <asset> [--model M] [--size 1K|2K] [--dry-run]`);
  console.error(`Assets: ${Object.keys(ASSETS).join(", ")}`);
  process.exit(1);
}

const model = flags.model || DEFAULT_MODEL;
const size = flags.size || DEFAULT_SIZE;
const webpPath = path.join(PUBLIC_DIR, `${asset.out}.webp`);
const price = PRICE_PER_IMAGE[model];

console.log(`asset    ${name}`);
console.log(`model    ${model}`);
console.log(`format   ${ASPECT} · ${size}`);
console.log(`prompt   ${asset.prompt.length} chars`);
console.log(`output   ${path.relative(ROOT, webpPath)}`);
console.log(`cost     ${price ? `~$${price.toFixed(4)}` : "unlisted for this model"}`);

if (flags["dry-run"]) {
  console.log("\ndry run — no API call made.");
  process.exit(0);
}

loadEnv();
const ai = new GoogleGenAI({ apiKey: requireApiKey() });

let interaction;
try {
  interaction = await ai.interactions.create({
    model,
    input: asset.prompt,
    response_format: {
      type: "image",
      // Only image/jpeg is accepted here. The docs sample shows image/png,
      // which the API rejects with a 400.
      mime_type: "image/jpeg",
      aspect_ratio: ASPECT,
      image_size: size,
    },
  });
} catch (err) {
  console.error(`\n${err?.status ?? ""} ${err?.message ?? err}`.trim());
  process.exit(1);
}

const b64 = interaction?.output_image?.data;
if (!b64) {
  // The docs were inconsistent about this field name; if it moved, show where.
  console.error("\nNo image in the response. Top-level keys:", Object.keys(interaction ?? {}));
  console.error(JSON.stringify(interaction, null, 2).slice(0, 2000));
  process.exit(1);
}

ensureDir(RAW_DIR);
const rawPath = path.join(RAW_DIR, `${name}-${stamp()}.jpg`);
fs.writeFileSync(rawPath, Buffer.from(b64, "base64"));
toWebp(rawPath, webpPath);

console.log(`\nmaster   ${path.relative(ROOT, rawPath)}  ${humanSize(rawPath)}`);
console.log(`shipped  ${path.relative(ROOT, webpPath)}  ${humanSize(webpPath)}`);
