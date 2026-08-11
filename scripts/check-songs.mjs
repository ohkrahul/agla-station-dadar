#!/usr/bin/env node
/**
 * Verify every YouTube ID in src/data/songs.ts before trusting it.
 *
 *   node scripts/check-songs.mjs
 *   node scripts/check-songs.mjs --id dQw4w9WgXcQ
 *
 * §6 requires each ID to be manually confirmed as embeddable. oEmbed is the
 * cheap machine half of that: a 200 means the video exists AND permits
 * embedding, and it returns the real title so a plausible-but-wrong ID pointing
 * at some other song gets caught instead of silently playing it.
 *
 * It does not check region restrictions, which vary by viewer — that part still
 * needs a human loading the deployed page.
 */
import { parseArgs } from "./lib.mjs";

const OEMBED = "https://www.youtube.com/oembed";

async function check(id) {
  const url = `${OEMBED}?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`
  )}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, title: body.title, author: body.author_name };
  } catch (err) {
    return { ok: false, reason: String(err?.message ?? err) };
  }
}

const { flags } = parseArgs(process.argv.slice(2));

// process.exit() straight after fetch trips a libuv teardown assertion on
// Windows, which corrupts the exit code. Setting exitCode and returning lets
// node close its handles first.
if (flags.id) {
  const r = await check(String(flags.id));
  console.log(flags.id, r.ok ? `OK  ${r.author} — ${r.title}` : `FAIL  ${r.reason}`);
  process.exitCode = r.ok ? 0 : 1;
}

else {
const { songs } = await import("../src/data/songs.ts");

const pending = songs.filter((s) => !s.youtubeId);
const withId = songs.filter((s) => s.youtubeId);

let bad = 0;
for (const song of withId) {
  const r = await check(song.youtubeId);
  if (!r.ok) {
    bad++;
    console.log(`FAIL  ${song.youtubeId}  ${song.title} — ${r.reason}`);
    continue;
  }
  // A wrong ID usually still resolves, so compare against the intended title.
  const loose = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches = loose(r.title).includes(loose(song.title));
  // The channel is shown because §6 wants official label/artist uploads, and a
  // fan reupload is far likelier to vanish or lose embed permission later.
  console.log(
    `${matches ? "OK  " : "??  "}${song.youtubeId}  ${song.title.padEnd(22)} ${r.author}` +
      (matches ? "" : `  → actually "${r.title}"`)
  );
  if (!matches) bad++;
}

console.log(
  `\n${withId.length - bad}/${withId.length} verified · ${pending.length} awaiting an ID · ${songs.length} total`
);
if (pending.length) {
  console.log("awaiting: " + pending.map((s) => s.title).join(", "));
}
process.exitCode = bad ? 1 : 0;
}
