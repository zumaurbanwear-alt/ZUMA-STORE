import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

// Change the file (keep it at /public/audio/theme.mp3) to swap the track.
const AUDIO_SRC = "/audio/theme.mp3";
const STORAGE_KEY = "zuma-audio-playing";
const VOLUME_KEY = "zuma-audio-volume";

type Ctx = {
  playing: boolean;
  toggle: () => void;
};

const AudioCtx = createContext<Ctx | null>(null);

// requestIdleCallback isn't available in Safari — setTimeout is the
// standard fallback for "run this once the browser isn't busy".
const onIdle = (cb: () => void) => {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === "function") {
    ric(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 300);
  }
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Created once — this provider lives above <Routes> so the same
  // <audio> element survives navigation (Index → Shop → Product...),
  // giving continuous, uninterrupted playback across pages.
  //
  // Setup itself is deferred to idle time, and the element uses
  // preload="none", so this 2.85MB background track never competes with
  // the page's own critical resources (fonts, hero image, route JS) for
  // bandwidth during first load — it only starts fetching once playback
  // is actually attempted, which by then is happening in the background.
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    let cancelled = false;
    let removeInteractionListeners: (() => void) | null = null;

    const setup = () => {
      if (cancelled) return;
      audio = new Audio();
      audio.preload = "none";
      audio.src = AUDIO_SRC;
      audio.loop = true;
      const savedVolume = localStorage.getItem(VOLUME_KEY);
      audio.volume = savedVolume ? Number(savedVolume) : 0.5;
      audioRef.current = audio;

      const markPlaying = () => {
        localStorage.setItem(STORAGE_KEY, "1");
        setPlaying(true);
      };
      const markPaused = () => {
        localStorage.setItem(STORAGE_KEY, "0");
        setPlaying(false);
      };
      audio.addEventListener("pause", markPaused);
      audio.addEventListener("play", markPlaying);

      const armFallback = () => {
        const events: (keyof DocumentEventMap)[] = ["click", "touchstart", "keydown", "scroll"];
        const start = () => {
          events.forEach((ev) => document.removeEventListener(ev, start));
          audio?.play().catch(() => {});
        };
        events.forEach((ev) => document.addEventListener(ev, start, { once: true, passive: true }));
        removeInteractionListeners = () => events.forEach((ev) => document.removeEventListener(ev, start));
      };

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== "0") {
        audio.play().catch(armFallback);
      }
    };

    onIdle(setup);

    return () => {
      cancelled = true;
      removeInteractionListeners?.();
      if (audio) {
        audio.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  return <AudioCtx.Provider value={{ playing, toggle }}>{children}</AudioCtx.Provider>;
};

export const useAudio = () => {
  const v = useContext(AudioCtx);
  if (!v) throw new Error("useAudio must be used inside AudioProvider");
  return v;
};
