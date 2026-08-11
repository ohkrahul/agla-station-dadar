/**
 * Minimal IFrame Player API access.
 *
 * Only the handful of members we actually call are typed — @types/youtube would
 * be a dependency for about fifteen lines of interface.
 */

export type YTPlayer = {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  getVolume(): number;
  /** Both in seconds; duration is 0 until metadata has loaded. */
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
};

/** https://developers.google.com/youtube/iframe_api_reference#Events */
export const YT_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
} as const;

type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SRC = "https://www.youtube.com/iframe_api";
let pending: Promise<YTNamespace> | null = null;

/**
 * Injects the API script once and resolves when YT is usable. The API calls a
 * single global callback, so concurrent callers share one promise rather than
 * each overwriting `onYouTubeIframeAPIReady`.
 */
export function loadIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadIframeApi called during SSR"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;

  pending = new Promise<YTNamespace>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API loaded without a Player constructor"));
    };

    const tag = document.createElement("script");
    tag.src = SRC;
    tag.async = true;
    tag.onerror = () => reject(new Error("Could not load the YouTube IFrame API"));
    document.head.appendChild(tag);
  });

  return pending;
}

/**
 * §6 requires the player to stay visible and uncovered; these are the documented
 * parameters that shape it without breaking that.
 *
 * `controls: 0` is allowed precisely because the deck supplies its own
 * play/pause, skip and volume through the API — Required Minimum Functionality
 * asks that disabling YouTube's controls be paired with equivalent ones, not
 * that the player be left bare. It also removes the settings gear, captions
 * button and progress bar, which is what makes the player read as a cassette
 * window rather than an embedded video.
 *
 * What CANNOT be removed: YouTube's own branding and the link back to the watch
 * page. Those are required, and covering them would breach the same terms that
 * keep the embed legitimate — so they stay.
 */
export function playerVars(): Record<string, string | number> {
  return {
    enablejsapi: 1,
    playsinline: 1,
    /** Our own transport drives the player, so YouTube's bar is redundant. */
    controls: 0,
    /** Related videos limited to the same channel; cannot be disabled outright. */
    rel: 0,
    /** No annotation overlays. */
    iv_load_policy: 3,
    /** Fullscreen would take over the carriage. */
    fs: 0,
    /** Keyboard belongs to the scene, not to a hidden iframe. */
    disablekb: 1,
    origin: window.location.origin,
  };
}
