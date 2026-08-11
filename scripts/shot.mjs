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

    /*
     * Whether the player is actually visible, walking up for a transparent or
     * hidden ancestor. Size alone would report "200x200 OK" for a player nobody
     * can see, which is worse than reporting nothing.
     */
    let seen = !!frame;
    if (frame) {
      for (let e = frame; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) {
          seen = false;
          break;
        }
      }
    }
    /*
     * A control sitting outside the viewport is only a bug if nothing can bring
     * it back. Inside a deliberately scrollable row it is reachable, so the
     * horizontal test is skipped there — otherwise the scrolling bottom bar
     * reports every off-screen chip as broken.
     */
    const scrollableX = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth + 1) {
          return true;
        }
      }
      return false;
    };

    const clipped = [...document.querySelectorAll("button, input, iframe")]
      .filter((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) return false;
        const vertical = b.bottom > window.innerHeight + 1 || b.top < -1;
        const horizontal = b.right > window.innerWidth + 1 || b.left < -1;
        return vertical || (horizontal && !scrollableX(el));
      })
      .map((el) => {
        const name =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 24) ||
          el.tagName.toLowerCase();
        const b = el.getBoundingClientRect();
        return `${name} [${Math.round(b.top)}..${Math.round(b.bottom)}]`;
      });

    /*
     * The window is the whole point of the scene, so no panel may sit on the
     * glass. This is a real regression that shipped once: the deck and the
     * control bar together needed more wall than the carriage leaves below the
     * window, so the deck rode up over it.
     *
     * The indicator is exempt — it is mounted on the frame deliberately.
     */
    const glass = document.querySelector(".window-box")?.getBoundingClientRect();
    const covering = [];
    if (glass) {
      for (const sel of [".console-mount", ".top-mount", ".rail-mount", ".carriage-props"]) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const b = el.getBoundingClientRect();
        const ox = Math.min(b.right, glass.right) - Math.max(b.left, glass.left);
        const oy = Math.min(b.bottom, glass.bottom) - Math.max(b.top, glass.top);
        if (ox > 2 && oy > 2) covering.push(`${sel} by ${Math.round(ox)}x${Math.round(oy)}px`);
      }
    }

    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      overflowY: doc.scrollHeight - doc.clientHeight,
      player: r ? { w: Math.round(r.width), h: Math.round(r.height), seen } : null,
      clipped: [...new Set(clipped)],
      covering,
    };
  });

  /*
   * Does it actually play? This is the whole risk of a hidden player: browsers
   * deprioritise invisible media, and YouTube can revoke embedding for a domain
   * that hides it. The transport button reads "Pause" only while playing, so it
   * is a reliable proxy for real playback in a headless run.
   */
  const playing = await page
    .getByRole("button", { name: /^pause$/i })
    .count()
    .then((n) => n > 0);

  const playerNote = !audit.player
    ? "player absent"
    : !audit.player.seen
      ? // Stated plainly rather than passed: the owner chose this, but the tool
        // must not certify a compliance it no longer has.
        `player ${audit.player.w}x${audit.player.h} HIDDEN (breaks §6 by design)`
      : `player ${audit.player.w}x${audit.player.h} ${
          audit.player.w >= 200 && audit.player.h >= 200 ? "visible OK" : "TOO SMALL (§6)"
        }`;

  const unexpected = [...new Set(missing)].filter((m) => !EXPECTED_MISSING.test(m));
  const pendingAudio = [...new Set(missing)].filter((m) => EXPECTED_MISSING.test(m));

  console.log(
    `${vp.name}  overflow ${audit.overflowX}/${audit.overflowY}  ${playerNote}` +
      `  ${playing ? "playing" : "NOT PLAYING"}` +
      (audit.clipped.length ? `  CLIPPED: ${audit.clipped.join(", ")}` : "") +
      (audit.covering.length ? `  ON THE GLASS: ${audit.covering.join(", ")}` : "") +
      (unexpected.length ? `  BROKEN: ${unexpected.join(", ")}` : "") +
      (pendingAudio.length ? `  (awaiting audio: ${pendingAudio.length} files)` : "") +
      (errors.length ? `  errors: ${errors.slice(0, 2).join(" | ")}` : "")
  );

  // One pass per mood on the widest viewport only — the moods differ in colour
  // and media, not in layout.
  if (vp.name.startsWith("desktop")) {
    // The mood control is a cycling chip on the bottom bar, so each click
    // advances Monsoon -> Shaam Ki Local -> Last Local.
    const weather = page.getByRole("button", { name: /^weather:/i });
    for (const name of ["shaam", "last"]) {
      await weather.click();
      // Long enough for the 1s crossfade and the wash transition to finish.
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, `mood-${name}.png`) });
    }
    await weather.click(); // back to Monsoon
    await page.waitForTimeout(1300);

    // Focus mode: the chrome must go and the player must stay (§7.3).
    const focusChip = page.getByRole("button", { name: /^focus mode:/i });
    await focusChip.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "focus.png") });
    const playerStillThere = await page.locator("iframe").isVisible();
    const railGone = await page
      .locator(".chrome-layer.is-hidden")
      .count()
      .then((n) => n > 0);
    console.log(`  focus mode: player visible = ${playerStillThere}, chrome hidden = ${railGone}`);
    // The chip itself is inert while focused; "Show controls" is the way back.
    await page.getByRole("button", { name: /show controls/i }).click();
    await page.waitForTimeout(700);

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
