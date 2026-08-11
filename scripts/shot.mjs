#!/usr/bin/env node
/**
 * Screenshot the running dev server at the viewports §8 step 10 asks about.
 *   node scripts/shot.mjs [url]
 */
import path from "node:path";
import { chromium } from "playwright";

import { ROOT, ensureDir } from "./lib.mjs";

const url0 = process.argv[2] || "http://localhost:3000";
const url = url0;
/** Absent until the licensed recordings land (§3 asset 07). Not a defect. */
const EXPECTED_MISSING = /\/agla-station\/audio\//;
const outDir = path.join(ROOT, "scripts", ".shots");
ensureDir(outDir);

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1280x720", width: 1280, height: 720 },
  { name: "phone-390x844", width: 390, height: 844 },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  /*
   * Report the failing URL, not just "404". The four ambience MP3s are known to
   * be absent until they are licensed, and a generic console error for those
   * would mask a genuine missing asset.
   */
  const missing = [];
  page.on("response", (res) => {
    if (res.status() < 400) return;
    const url = new URL(res.url());
    if (url.origin !== new URL(url0).origin) return; // ignore YouTube's own noise
    missing.push(`${res.status()} ${url.pathname}`);
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Capture the boarding gate before dismissing it — it is the first thing a
  // visitor sees, so it needs reviewing too.
  await page.waitForTimeout(900);
  if (vp.name.startsWith("desktop")) {
    await page.screenshot({ path: path.join(outDir, "board.png") });
  }

  await page.getByRole("button", { name: /board train/i }).click();
  // Long enough for the IFrame API to load and the player to mount.
  await page.waitForTimeout(3500);

  const file = path.join(outDir, `${vp.name}.png`);
  await page.screenshot({ path: file });

  /*
   * §10 asks for three separate things, and a scrollbar check only covers one.
   * The scene is `overflow: hidden`, so content that does not fit is silently
   * CLIPPED rather than scrolled — which is how the transport keys once fell off
   * the bottom of a phone with "overflow y:0" reported. So also assert that the
   * player meets YouTube's 200x200 floor (§6) and that everything interactive is
   * actually inside the viewport.
   */
  const audit = await page.evaluate(() => {
    const doc = document.documentElement;
    const frame = document.querySelector("iframe");
    const r = frame?.getBoundingClientRect();
    const clipped = [...document.querySelectorAll("button, input, iframe")]
      .filter((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) return false;
        return (
          b.bottom > window.innerHeight + 1 ||
          b.top < -1 ||
          b.right > window.innerWidth + 1 ||
          b.left < -1
        );
      })
      .map((el) => {
        const name =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 24) ||
          el.tagName.toLowerCase();
        const b = el.getBoundingClientRect();
        return `${name} [${Math.round(b.top)}..${Math.round(b.bottom)}]`;
      });

    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      overflowY: doc.scrollHeight - doc.clientHeight,
      player: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      clipped: [...new Set(clipped)],
    };
  });

  const playerNote = audit.player
    ? `player ${audit.player.w}x${audit.player.h} ${
        audit.player.w >= 200 && audit.player.h >= 200 ? "OK" : "TOO SMALL (§6)"
      }`
    : "player absent";

  const unexpected = [...new Set(missing)].filter((m) => !EXPECTED_MISSING.test(m));
  const pendingAudio = [...new Set(missing)].filter((m) => EXPECTED_MISSING.test(m));

  console.log(
    `${vp.name}  overflow ${audit.overflowX}/${audit.overflowY}  ${playerNote}` +
      (audit.clipped.length ? `  CLIPPED: ${audit.clipped.join(", ")}` : "") +
      (unexpected.length ? `  BROKEN: ${unexpected.join(", ")}` : "") +
      (pendingAudio.length ? `  (awaiting audio: ${pendingAudio.length} files)` : "") +
      (errors.length ? `  errors: ${errors.slice(0, 2).join(" | ")}` : "")
  );

  // One pass per mood on the widest viewport only — the moods differ in colour
  // and media, not in layout.
  if (vp.name.startsWith("desktop")) {
    for (const label of ["Shaam Ki Local", "Last Local"]) {
      await page.getByRole("radio", { name: new RegExp(label, "i") }).click();
      // Long enough for the 1s crossfade and the wash transition to finish.
      await page.waitForTimeout(1400);
      await page.screenshot({
        path: path.join(outDir, `mood-${label.split(" ")[0].toLowerCase()}.png`),
      });
    }

    await page.getByRole("radio", { name: /monsoon/i }).click();
    await page.waitForTimeout(1200);

    // Focus mode: the chrome must go and the player must stay (§7.3).
    await page.getByRole("button", { name: /^focus$/i }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, "focus.png") });
    const playerStillThere = await page.locator("iframe").isVisible();
    console.log(`  focus mode: player visible = ${playerStillThere}`);
    await page.getByRole("button", { name: /show controls/i }).click();
    await page.waitForTimeout(600);

    /*
     * The arrival board only exists for a few seconds per station, so a normal
     * screenshot run would never catch it. Rather than idle through a 50s leg,
     * wait for the phase the board belongs to.
     */
    await page
      .locator(".arrival-board.is-in")
      .waitFor({ state: "visible", timeout: 70_000 })
      .catch(() => console.log("  arrival board: NOT seen within 70s"));
    // Let the deceleration easing finish so the board is shot at rest.
    await page.waitForTimeout(3600);
    await page.screenshot({ path: path.join(outDir, "arrival.png") });
    console.log("  mood, focus and arrival shots captured");
  }

  await page.close();
}

await browser.close();
console.log(`\nshots in ${path.relative(ROOT, outDir)}`);
