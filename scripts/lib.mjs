/** Shared bits for the two generation scripts. Development only — never imported by the app. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC_DIR = path.join(ROOT, "public", "agla-station");
/** Untouched model output, kept forever so no attempt is ever lost. Gitignored. */
export const RAW_DIR = path.join(ROOT, "scripts", ".raw");

/**
 * Plain node does not read .env files the way Next.js does, and these scripts
 * run outside Next. .env.local wins over .env, and a real environment
 * variable wins over both.
 */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["'](.*)["']$/, "$1");
      }
    }
  }
}

export function requireApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local.");
    process.exit(1);
  }
  return key;
}

/** `--flag value` and `--flag` from argv, plus the bare positional. */
export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const name = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags[name] = next;
      i++;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function ffmpeg(args) {
  if (!ffmpegPath) {
    console.error("ffmpeg-static did not resolve a binary. Run: npm i -D ffmpeg-static");
    process.exit(1);
  }
  try {
    execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    // execFileSync surfaces stderr as a Buffer, which prints as a wall of byte
    // values. Show the last real lines instead — that is where ffmpeg says why.
    const text = Buffer.isBuffer(err.stderr) ? err.stderr.toString("utf8") : String(err.stderr ?? err);
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    console.error(`\nffmpeg failed:\n  ${lines.slice(-6).join("\n  ")}`);
    throw new Error("ffmpeg failed");
  }
}

/**
 * Frame count and rate, decoded from ffmpeg's own progress output.
 * ffmpeg-static ships no ffprobe, so this parses stderr instead of adding a
 * second binary for two numbers.
 */
export function probeVideo(file) {
  const r = spawnSync(
    ffmpegPath,
    ["-hide_banner", "-i", file, "-map", "0:v:0", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const err = `${r.stderr ?? ""}`;
  const frames = [...err.matchAll(/frame=\s*(\d+)/g)].pop()?.[1];
  const fps = err.match(/,\s*([\d.]+)\s*fps/)?.[1];
  return {
    frames: frames ? Number(frames) : null,
    fps: fps ? Number(fps) : null,
  };
}

/**
 * Veo output -> the shipped loop: strip audio, bake a seamless loop, compress.
 *
 * -an is mandatory rather than an optimisation: Veo always generates audio and
 * offers no way to disable it, while §20 keeps ambience and music as separate
 * layers the user controls.
 *
 * The loop is made seamless in the FILE, so the browser needs nothing but
 * `<video loop>`. The tail is overlaid on the head with a falling alpha ramp,
 * so playback hands over from the end of the clip to its beginning before the
 * wrap ever happens.
 *
 * Selection is by FRAME INDEX, not by seconds. Float second boundaries round to
 * whichever frame is nearest and left the seam one or two frames out of step —
 * a small backward hop every loop. The tail deliberately starts one frame
 * BEFORE the base ends so that the first output frame and the last output frame
 * are the same source frame, which is what makes the wrap exact.
 */
export function processLoop(rawPath, outPath, { duration = 8, fade = 0.7 } = {}) {
  const probed = probeVideo(rawPath);
  const fps = probed.fps || 24;
  const total = probed.frames || Math.round(duration * fps);

  const fadeFrames = Math.max(1, Math.round(fade * fps));
  const baseEnd = total - fadeFrames; // base keeps frames 0 .. baseEnd-1
  const tailStart = baseEnd - 1; // one frame of overlap, on purpose

  const filter = [
    `[0:v]select='lt(n\\,${baseEnd})',setpts=N/FRAME_RATE/TB[base]`,
    `[0:v]select='gte(n\\,${tailStart})',setpts=N/FRAME_RATE/TB,format=yuva420p,` +
      `fade=t=out:st=0:d=${((fadeFrames + 1) / fps).toFixed(4)}:alpha=1[tail]`,
    `[base][tail]overlay=eof_action=pass,format=yuv420p[v]`,
  ].join(";");

  ensureDir(path.dirname(outPath));
  ffmpeg([
    "-y",
    "-i", rawPath,
    "-filter_complex", filter,
    "-map", "[v]",
    "-an",
    "-c:v", "libx264",
    "-crf", "24",
    "-preset", "medium",
    "-movflags", "+faststart",
    outPath,
  ]);
  return outPath;
}

/**
 * ffmpeg can exit 0 having written a header and no content — an empty filter
 * graph does exactly that. Any pipeline that produced a "successful" 410-byte
 * bed would otherwise ship silently.
 */
export function assertNonEmpty(file, minBytes = 2048) {
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  if (size < minBytes) {
    throw new Error(
      `${path.basename(file)} is ${size} bytes — ffmpeg produced no real output`
    );
  }
  return file;
}

/** PNG master -> the .webp the playbook manifest names (§3). */
export function toWebp(pngPath, webpPath) {
  ensureDir(path.dirname(webpPath));
  ffmpeg(["-y", "-i", pngPath, "-c:v", "libwebp", "-quality", "90", webpPath]);
  return webpPath;
}

/**
 * Newest untouched model output for an asset. Veo wants a real JPEG, not the
 * compressed .webp we ship, and the raw files are timestamped ISO so a plain
 * lexicographic sort is chronological.
 */
export function latestRaw(prefix, ext = ".jpg") {
  if (!fs.existsSync(RAW_DIR)) return null;
  const match = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith(ext))
    .sort();
  return match.length ? path.join(RAW_DIR, match[match.length - 1]) : null;
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function humanSize(p) {
  return `${(fs.statSync(p).size / 1024).toFixed(0)} KB`;
}
