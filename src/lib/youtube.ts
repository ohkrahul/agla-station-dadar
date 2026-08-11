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
 * §6 requires the player to stay visible and uncovered, and these are the
 * documented parameters that keep it that way. `controls: 1` is the simplest
 * safe choice for v1 — our own buttons sit outside the iframe and drive it
 * through the API rather than replacing YouTube's own controls.
 */
export function playerVars(): Record<string, string | number> {
  return {
    enablejsapi: 1,
    playsinline: 1,
    controls: 1,
    rel: 0,
    modestbranding: 1,
    origin: window.location.origin,
  };
}
