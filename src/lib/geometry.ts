import type { CSSProperties } from "react";

/**
 * Native size of train-interior-master (2K, 16:9-ish). The plate is sized from
 * this exact ratio rather than a rounded 16/9 so the window rectangle below
 * stays registered to the photograph at every viewport.
 */
export const PLATE_W = 2752;
export const PLATE_H = 1536;
export const PLATE_RATIO = PLATE_W / PLATE_H;

/**
 * The window glass, measured off the generated master, as a percentage of the
 * PLATE (not the viewport).
 *
 * The environment media is positioned over this rectangle — we do not cut a
 * hole in the photograph (playbook §8 step 3). The generated aperture is a flat
 * neutral grey, so a hairline of misalignment is hidden by the inset shadow
 * rather than leaking daylight.
 *
 * These are the calibration knobs. If the master image is ever regenerated,
 * re-measure the grey area and edit only these four numbers.
 */
export const WINDOW_RECT = {
  left: 23.2,
  top: 11.2,
  width: 53.3,
  height: 56.9,
} as const;

/** Where the glass ends, in plate %. The lower carriage band starts here. */
export const WINDOW_BOTTOM = WINDOW_RECT.top + WINDOW_RECT.height;

/* Portrait zoom lives in globals.css as --portrait-zoom, next to the rest of
   the plate sizing maths it has to stay consistent with. */

/**
 * YouTube player sizing.
 *
 * Not a design preference — YouTube's Required Minimum Functionality terms
 * oblige us to keep the player visible and never below 200x200px (§6). A 16:9
 * player 200px tall is 356px wide, which will not fit a 320px viewport, so
 * `minHeightPx` deliberately wins over the 16:9 ratio on very narrow screens
 * and the video letterboxes itself inside a taller box. Removing `min-height`
 * to "tidy up" the aspect ratio would break compliance.
 */
export const PLAYER = {
  maxWidthPx: 480,
  minHeightPx: 200,
  viewportGutterPx: 32,
} as const;

export const rectToStyle = (r: typeof WINDOW_RECT): CSSProperties => ({
  left: `${r.left}%`,
  top: `${r.top}%`,
  width: `${r.width}%`,
  height: `${r.height}%`,
});
