#!/usr/bin/env node
/**
 * The one AI video in AGLA STATION: the monsoon window loop (playbook §5).
 *
 *   node scripts/generate-video.mjs --dry-run
 *   ALLOW_PAID_VIDEO=true node scripts/generate-video.mjs --yes
 *
 * Two locks, deliberately. §2 sets the budget at 1–3 Veo attempts total, and a
 * stray invocation is real money, so the env gate and --yes must BOTH be set.
 * Every attempt is kept in scripts/.raw/ — a paid artifact is never discarded.
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
  latestRaw,
  loadEnv,
  parseArgs,
  processLoop,
  requireApiKey,
  stamp,
} from "./lib.mjs";

/** §2: Lite first. Only move to Fast if Lite is visibly inadequate. */
const MODEL = "veo-3.1-lite-generate-preview";
const RESOLUTION = "720p";
/** Number, not string. The published docs show "8"; the API rejects that. */
const DURATION = 8;
/** Seconds of tail blended back over the head to make the loop seamless. */
const FADE = 0.7;
const PRICE_PER_SECOND = { "veo-3.1-lite-generate-preview": 0.05, "veo-3.1-fast-generate-preview": 0.1 };

/** Verbatim from playbook §5.1. */
const PROMPT = `Animate the supplied Mumbai monsoon railway reference image as a continuous realistic view from inside a moving Mumbai suburban local train. The camera is fixed at passenger-window height and looks exactly sideways. Do not pan, tilt, zoom, dolly, orbit, reframe or cut. The entire environment moves naturally from RIGHT TO LEFT, making the viewer feel the train is travelling forward. Use physically convincing layered parallax: tracks and very close foreground details move fastest; nearby electrical poles pass quickly; mid-distance buildings move at moderate speed; distant towers and skyline drift slowly. Preserve the reference architecture, railway infrastructure, skyline, weather and color palette. Keep grey-blue humid monsoon daylight stable. Wet tracks may show subtle changing reflections. Vegetation can move extremely slightly. Allow only tiny natural train vibration, never handheld camera movement. The shot must feel like an ordinary real passenger window view, not a drone shot or cinematic camera move. No scene cuts, no transitions, no speed ramp, no timelapse, no architecture morphing, no new buildings appearing, no camera zoom, no rain stuck to the camera lens, no train blocking the foreground, no readable text, no logos. Create one uninterrupted 8-second 16:9 720p travelling shot suitable for looping behind a website train window.`;

const { flags } = parseArgs(process.argv.slice(2));
const model = flags.model || MODEL;
const reference = flags.ref || latestRaw("monsoon-ref");
const shipped = path.join(PUBLIC_DIR, "environment", "monsoon-loop.mp4");
const estimate = (PRICE_PER_SECOND[model] ?? 0) * DURATION;

if (!reference || !fs.existsSync(reference)) {
  console.error("No monsoon reference found. Run: npm run gen:image monsoon-ref");
  process.exit(1);
}

console.log(`model      ${model}`);
console.log(`format     16:9 · ${RESOLUTION} · ${DURATION}s`);
console.log(`reference  ${path.relative(ROOT, reference)}`);
console.log(`output     ${path.relative(ROOT, shipped)}`);
console.log(`COST       ~$${estimate.toFixed(2)} for this single pass`);

if (flags["dry-run"]) {
  console.log("\ndry run — no API call, no charge.");
  process.exit(0);
}

/**
 * §5 step 5: if the motion is mostly right, fix loop/compression locally
 * instead of paying for another generation. Re-runs post-processing on the
 * newest raw clip we already own. Free, and no gate needed.
 */
if (flags.reprocess) {
  const raw = flags.raw || latestRaw("monsoon-veo", ".mp4");
  if (!raw) {
    console.error("No raw Veo clip in scripts/.raw/ to reprocess.");
    process.exit(1);
  }
  console.log(`\nreprocessing ${path.relative(ROOT, raw)} (no charge)`);
  processLoop(raw, shipped, { duration: DURATION, fade: FADE });
  console.log(`shipped    ${path.relative(ROOT, shipped)}  ${humanSize(shipped)}`);
  process.exit(0);
}

// ── The two locks ──────────────────────────────────────────────────────────
loadEnv();

if (process.env.ALLOW_PAID_VIDEO !== "true") {
  console.error(
    `\nRefusing to run: ALLOW_PAID_VIDEO is not "true" (currently ${
      process.env.ALLOW_PAID_VIDEO ?? "unset"
    }).`
  );
  console.error("This call costs real money. Set it in .env.local only when you mean it.");
  process.exit(1);
}

if (!flags.yes) {
  console.error(`\nRefusing to run: pass --yes to confirm the ~$${estimate.toFixed(2)} charge.`);
  process.exit(1);
}

// ── Generate ───────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: requireApiKey() });

console.log("\nsubmitting…");
let operation;
try {
  operation = await ai.models.generateVideos({
    model,
    // Top-level prompt/image are deprecated in favour of `source`.
    source: {
      prompt: PROMPT,
      image: {
        imageBytes: fs.readFileSync(reference).toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    config: {
      aspectRatio: "16:9",
      resolution: RESOLUTION,
      durationSeconds: DURATION,
    },
  });
} catch (err) {
  console.error(`\n${err?.status ?? ""} ${err?.message ?? err}`.trim());
  process.exit(1);
}

const started = Date.now();
while (!operation.done) {
  await new Promise((r) => setTimeout(r, 10_000));
  process.stdout.write(`  polling… ${Math.round((Date.now() - started) / 1000)}s\n`);
  try {
    operation = await ai.operations.getVideosOperation({ operation });
  } catch (err) {
    console.error(`\npolling failed: ${err?.message ?? err}`);
    process.exit(1);
  }
}

if (operation.error) {
  console.error(`\ngeneration failed: ${JSON.stringify(operation.error).slice(0, 600)}`);
  process.exit(1);
}

const video = operation.response?.generatedVideos?.[0]?.video;
if (!video) {
  console.error("\nNo video in the response. Response keys:", Object.keys(operation.response ?? {}));
  console.error(JSON.stringify(operation.response, null, 2).slice(0, 1500));
  process.exit(1);
}

ensureDir(RAW_DIR);
const rawPath = path.join(RAW_DIR, `monsoon-veo-${stamp()}.mp4`);
await ai.files.download({ file: video, downloadPath: rawPath });
console.log(`\nraw        ${path.relative(ROOT, rawPath)}  ${humanSize(rawPath)}`);

processLoop(rawPath, shipped, { duration: DURATION, fade: FADE });

console.log(`shipped    ${path.relative(ROOT, shipped)}  ${humanSize(shipped)}`);
console.log("\nNext: confirm there is no audio stream, then check the loop seam in-browser.");
