#!/usr/bin/env node
/**
 * Builds the four ambience beds (§3 asset 07, §20).
 *
 *   node scripts/fetch-audio.mjs
 *
 * Sources are Wikimedia Commons files that are public domain or CC0, so the
 * result is safe to ship or share — chosen over "whatever plays" because a
 * private demo has a habit of becoming a public link later. The door chime is
 * synthesised outright: two sine tones need no licence at all.
 *
 * Each bed is made to loop seamlessly in the FILE, using the same tail-over-head
 * crossfade as the video, so the player needs nothing but `loop`.
 */
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_DIR,
  RAW_DIR,
  ROOT,
  assertNonEmpty,
  ensureDir,
  ffmpeg,
  humanSize,
} from "./lib.mjs";

/**
 * Wikimedia's User-Agent policy wants a contact URL or address in the string,
 * and serves 403/429 to anything that omits one.
 */
const UA = "AGLA-STATION-asset-build/0.1 (https://github.com/agla-station; dev@agla.local)";

/**
 * Fetch to disk before handing anything to ffmpeg.
 *
 * ffmpeg cannot read these URLs directly: Wikimedia rate-limits its default
 * User-Agent with a 429. `maxBytes` range-fetches only the head of a very long
 * source — a truncated FLAC still decodes up to where the data stops, which is
 * far past the window we want.
 */
async function download(url, dest, maxBytes) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  ensureDir(path.dirname(dest));

  const headers = { "User-Agent": UA };
  if (maxBytes) headers.Range = `bytes=0-${maxBytes}`;

  const res = await fetch(url, { headers });
  if (!res.ok && res.status !== 206) {
    throw new Error(`download failed: ${res.status} ${url}`);
  }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

const OUT = path.join(PUBLIC_DIR, "audio");
const API = "https://commons.wikimedia.org/w/api.php";

/**
 * `take` is the window pulled from the source; `fade` is how much of the tail is
 * blended back over the head, so the finished loop is `take - fade` long.
 */
const BEDS = [
  {
    name: "train-loop",
    title: "File:Complete train ride 4 minutes.ogg",
    // Well into the ride, where the running noise is steady.
    from: 75,
    take: 33,
    fade: 3,
    gain: -24,
  },
  {
    name: "station-bed",
    title: "File:Droning train motor on halt.ogg",
    from: 0.2,
    take: 4.4,
    fade: 1.4,
    gain: -26,
  },
  {
    name: "rain-loop",
    title: "File:Urban Street on a Rainy Afternoon.flac",
    // 30 minutes long; ffmpeg range-seeks so only this window is fetched.
    // 30 minutes / 89 MB in total, so only the head is fetched and the window
    // is taken from within it.
    from: 40,
    take: 28,
    fade: 3,
    gain: -25,
    maxBytes: 14_000_000,
  },
];

async function resolve(title) {
  const url = new URL(API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("titles", title);

  // Wikimedia's API policy requires a descriptive User-Agent; without one it
  // serves an HTML error page instead of JSON.
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Commons API returned ${res.status}`);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  if (!page?.imageinfo) throw new Error(`Commons has no file "${title}"`);

  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const strip = (s) => String(s ?? "").replace(/<[^>]*>/g, "").trim();

  return {
    // The API decorates the URL with campaign params; ffmpeg does not need them.
    direct: info.url.split("?")[0],
    licence: strip(meta.LicenseShortName?.value) || "unknown",
    author: strip(meta.Artist?.value) || "unknown",
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

ensureDir(OUT);
const credits = [];

for (const bed of BEDS) {
  const src = await resolve(bed.title);

  // Refuse anything that is not clearly free. A copyleft or by-attribution bed
  // is a licensing obligation hiding inside a static asset.
  if (!/public domain|cc0/i.test(src.licence)) {
    console.error(`skipping ${bed.name}: licence is "${src.licence}", not PD/CC0`);
    continue;
  }

  const local = await download(
    src.direct,
    path.join(RAW_DIR, "audio", path.basename(new URL(src.direct).pathname)),
    bed.maxBytes
  );

  const out = path.join(OUT, `${bed.name}.mp3`);
  const body = (bed.take - bed.fade).toFixed(2);

  /*
   * body = window[fade..take], head = window[0..fade].
   * acrossfade(body, head) ends on the same audio its own start plays, so the
   * wrap is inaudible.
   */
  /*
   * The source is opened TWICE on purpose, rather than split from one decoder.
   * acrossfade buffers its first input to EOF before touching the second, which
   * deadlocks against asplit sharing a single decoder and yields a 410-byte file
   * with exit code 0. Two decoders cost nothing here and simply work.
   */
  const filter = [
    `[0:a]atrim=${bed.fade}:${bed.take},asetpts=PTS-STARTPTS[body]`,
    `[1:a]atrim=0:${bed.fade},asetpts=PTS-STARTPTS[head]`,
    `[body][head]acrossfade=d=${bed.fade}:c1=tri:c2=tri[x]`,
    `[x]volume=${bed.gain}dB[out]`,
  ].join(";");

  process.stdout.write(`${bed.name.padEnd(13)} ${src.licence.padEnd(14)} `);
  ffmpeg([
    "-y",
    "-ss", String(bed.from),
    "-t", String(bed.take),
    "-i", local,
    "-ss", String(bed.from),
    "-t", String(bed.take),
    "-i", local,
    "-filter_complex", filter,
    "-map", "[out]",
    "-ac", "2",
    "-c:a", "libmp3lame",
    "-b:a", "112k",
    out,
  ]);
  assertNonEmpty(out);
  console.log(`${body}s loop  ${humanSize(out)}`);

  credits.push(`- **${bed.name}.mp3** — ${src.licence} · ${src.author} · ${src.page}`);
}

/* Door chime: a descending two-tone, the way a carriage door cue actually goes.
   Synthesised, so there is nothing to attribute and nothing to break. */
const door = path.join(OUT, "door-beep.mp3");
process.stdout.write("door-beep     synthesised    ");
ffmpeg([
  "-y",
  "-f", "lavfi", "-i", "sine=f=1046:d=0.18",
  "-f", "lavfi", "-i", "sine=f=784:d=0.3",
  "-filter_complex",
  "[0:a][1:a]concat=n=2:v=0:a=1,afade=t=out:st=0.36:d=0.12,volume=-20dB[out]",
  "-map", "[out]",
  "-ac", "2",
  "-c:a", "libmp3lame",
  "-b:a", "112k",
  door,
]);
console.log(`0.48s cue    ${humanSize(door)}`);
credits.push("- **door-beep.mp3** — synthesised with ffmpeg (no third-party content)");

fs.writeFileSync(
  path.join(OUT, "CREDITS.md"),
  `# Ambience sources\n\nRebuild with \`node scripts/fetch-audio.mjs\`.\nOnly public-domain and CC0 sources are accepted; the script refuses anything else.\n\n${credits.join(
    "\n"
  )}\n`
);

console.log(`\ncredits written to ${path.relative(ROOT, path.join(OUT, "CREDITS.md"))}`);
