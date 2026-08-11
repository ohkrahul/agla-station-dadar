/**
 * The three v1 moods (playbook §7.2).
 *
 * Only Monsoon gets AI video — it carries the strongest emotional payoff and
 * §3 is explicit that the others use stills animated in code. Adding two more
 * Veo clips would triple the media budget for a fraction of the effect.
 */
export type MoodId = "monsoon" | "golden" | "night";

export type Mood = {
  id: MoodId;
  /** Shown on the switch. The playbook's own names — keep them. */
  label: string;
  sublabel: string;
  /**
   * Readout for the top bar. Not a live forecast — it describes the scene you
   * chose, which is the only honest thing a static asset can report.
   */
  weather: string;
  glyph: string;
  media:
    | { kind: "video"; src: string; poster: string }
    /** `tile` is the mirror-doubled version, built by scripts/make-tiles.mjs. */
    | { kind: "still"; src: string; tile: string };
  rain: boolean;
  /** Interior colour grade, applied over the whole carriage. */
  wash: string;
  washStrength: number;
  /**
   * How far to darken the carriage. Separate from the wash because soft-light
   * shifts hue without reducing brightness, and a night carriage lit like noon
   * breaks the illusion however blue it is.
   */
  dim: number;
};

const ENV = "/agla-station/environment";

export const moods: Record<MoodId, Mood> = {
  monsoon: {
    id: "monsoon",
    label: "Monsoon",
    sublabel: "मुंबई पाऊस",
    weather: "28°C",
    glyph: "🌧",
    media: {
      kind: "video",
      src: `${ENV}/monsoon-loop.mp4`,
      poster: `${ENV}/monsoon-reference.webp`,
    },
    rain: true,
    wash: "#5c7d94",
    washStrength: 0.16,
    dim: 0.05,
  },
  golden: {
    id: "golden",
    label: "Shaam Ki Local",
    sublabel: "संध्याकाळ",
    weather: "31°C",
    glyph: "🌇",
    media: {
      kind: "still",
      src: `${ENV}/golden-hour.webp`,
      tile: `${ENV}/golden-hour-tile.webp`,
    },
    rain: false,
    wash: "#e09b4a",
    washStrength: 0.18,
    dim: 0,
  },
  night: {
    id: "night",
    label: "Last Local",
    sublabel: "शेवटची लोकल",
    weather: "24°C",
    glyph: "🌙",
    media: {
      kind: "still",
      src: `${ENV}/night.webp`,
      tile: `${ENV}/night-tile.webp`,
    },
    rain: false,
    wash: "#1d2c48",
    washStrength: 0.3,
    dim: 0.42,
  },
};

export const moodOrder: MoodId[] = ["monsoon", "golden", "night"];
