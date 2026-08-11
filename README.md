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

`.github/workflows/deploy.yml` runs on every push to `main`:

1. **verify** — `npm ci`, `tsc --noEmit`, `next build`. Also runs on pull requests, and
   needs no secrets, so a PR is checked even when it cannot deploy.
2. **deploy** — `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.
   Only on a push to `main`, and only if verify passed.

Building in CI rather than on Vercel means a broken build fails the check instead of
failing the deployment.

Three repository secrets are required (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel link`, then read `.vercel/project.json` (`orgId`) |
| `VERCEL_PROJECT_ID` | same file (`projectId`) |

`vercel.json` sets `git.deploymentEnabled.main` to `false`. **This is load-bearing.**
Vercel's Git integration deploys on push by itself, so without it every push would deploy
twice — once from the integration and once from the workflow — and the two would race to
production. The setting only affects Git-triggered deploys; CLI deploys still work.

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

## Credits

Ambience sources and licences: [`public/agla-station/audio/CREDITS.md`](public/agla-station/audio/CREDITS.md).
All beds are public domain or CC0; the door chime is synthesised. Song metadata points at
official label uploads (Saregama, YRF, T-Series, Sony Music India) — embedding does not
transfer any ownership, and availability stays with YouTube and the rights holders.

Visuals generated with Gemini 3.1 Flash Image / Flash Lite Image and Veo 3.1 Lite.
