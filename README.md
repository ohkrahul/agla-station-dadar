# AGLA STATION — Mumbai Local Radio

Board a Mumbai suburban local, watch monsoon Mumbai move past the window, and play a
curated song through a visible YouTube player.

The train is the interface. One route, one screen, no scroll, no backend.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4. No animation library — the fan,
handles, rain, carriage vibration, mood grade and still-mood travel are all CSS.

Media is generated **once during development** and shipped as static assets. No visitor
ever triggers a Gemini call.

## Running it

```bash
npm install
npm run dev
```

The assets in `public/agla-station/` are committed, so it runs without any API key.

## Regenerating media (optional, costs money)

Put your key in `.env.local`:

```
GEMINI_API_KEY=...
ALLOW_PAID_VIDEO=false
```

| Command | What it does | Cost |
|---|---|---|
| `npm run gen:image <asset>` | One still via Gemini Flash Lite Image. `--dry-run` resolves everything without calling the API. Assets: `interior`, `monsoon-ref`, `golden-hour`, `night`, `platform` | ~$0.03 |
| `npm run gen:video` | The single monsoon loop via Veo 3.1 Lite. Refuses to run unless `ALLOW_PAID_VIDEO=true` **and** `--yes` are both set | ~$0.40 |
| `npm run gen:video -- --reprocess` | Rebuilds the loop from the clip already downloaded | free |
| `node scripts/make-tiles.mjs` | Mirror-doubled tiles for the still moods | free |
| `node scripts/fetch-audio.mjs` | Ambience beds from public-domain / CC0 sources | free |
| `npm run check:songs` | Verifies every YouTube ID is live, embeddable, and the right video | free |
| `npm run shot` | Screenshots three viewports and audits player size / clipped controls | free |

Raw model output is kept in `scripts/.raw/` (gitignored) so no paid generation is ever lost.

## Deploying

Push to `main`. Vercel's Git integration builds and deploys it —
[agla-station-dadar.vercel.app](https://agla-station-dadar.vercel.app).

`.github/workflows/ci.yml` runs `tsc --noEmit` and `next build` on every push and pull
request. It needs no secrets, so forks and PRs are checked too.

The check and the deploy are **independent**: Vercel builds from the same push regardless
of whether CI passes, so a red check does not block a release. That is a deliberate
trade for having no tokens to manage. To gate deploys on a green check instead, deploy
from the workflow with the Vercel CLI (`vercel pull` → `vercel build --prod` →
`vercel deploy --prebuilt --prod`), add `VERCEL_TOKEN`, `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID` as repository secrets, and set `git.deploymentEnabled.main` to
`false` in a `vercel.json` so the integration stops deploying in parallel.

No API key is needed to build or deploy. All media is committed and generation is a
development-only step.

## Things that look odd but are deliberate

**Only the monsoon mood has video.** Golden Hour and Last Local scroll a mirror-doubled
still. `[image | mirrored image]` tiles without a seam, because each junction repeats an
identical column — so two copies side by side can translate `-50%` forever. It buys real
continuous travel for no extra generation cost. The limit: one flat plane, so near track
and far skyline move at the same rate.

**The monsoon loop is seamless in the file, not in code.** The tail is blended back over
the head and the clip trimmed, selecting by frame index rather than by seconds — float
boundaries left the seam a frame out of step, which showed as a hop every loop. The
browser needs nothing but `<video loop>`.

**Nothing is ever drawn on top of the YouTube iframe.** YouTube's Required Minimum
Functionality terms need the player visible, uncropped and never below 200×200px. All the
physical character lives in the bezel, bolts and engraved plate *around* the rectangle.
Don't add a texture, gradient, scanline or overlay inside `.player-screen`.

**The carriage vibration wraps only the imagery.** Wrapping the whole tree would
transform-animate every control and the iframe forever.

**Window geometry lives in one place.** `src/lib/geometry.ts` holds the window rectangle
as percentages of the carriage photograph, measured off the generated master. Regenerate
the master and those four numbers are the only thing to re-measure.

**Panels are positioned around the photograph, not on a grid.** The window sits where the
generated carriage puts it — roughly 23–76% across and 11–68% down — so the route rail goes
left of it, the wall props right of it, and the deck and bar below. Those are the areas of
carriage the photo leaves free. Moving a panel means checking it still clears the glass.

**Portrait drops the route rail, the wall props and the journey-mode panel.** A phone has no
room for a sidebar and a wall of stickers, and pretending otherwise is what pushed the
transport keys off the bottom of the screen. The indicator also loses its third script,
which for most Mumbai names is identical to the Marathi anyway.

**Portrait overrides live at the end of the stylesheet.** They have to: several of the
panels they hide declare `display` in their own rule, so an earlier `display: none` loses
on source order rather than specificity.

**`scripts/shot.mjs` is the layout test.** The scene is `overflow: hidden`, so anything
that does not fit is silently clipped rather than scrolled — a scrollbar check would report
nothing. It measures the player against the 200×200 floor and flags any control outside the
viewport, ignoring ones inside a deliberately scrollable row.

## Credits

Ambience sources and licences: [`public/agla-station/audio/CREDITS.md`](public/agla-station/audio/CREDITS.md).
All beds are public domain or CC0; the door chime is synthesised. Song metadata points at
official label uploads (Saregama, YRF, T-Series, Sony Music India) — embedding does not
transfer any ownership, and availability stays with YouTube and the rights holders.

Visuals generated with Gemini 3.1 Flash Image / Flash Lite Image and Veo 3.1 Lite.
