import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

// Change the file (keep it at /public/audio/theme.mp3) to swap the track.
const AUDIO_SRC = "/audio/theme.mp3";
const STORAGE_KEY = "zuma-audio-playing";
const VOLUME_KEY = "zuma-audio-volume";
const INTERACTION_EVENTS: (keyof DocumentEventMap)[] = ["click", "touchstart", "keydown", "scroll"];

type Ctx = {
  playing: boolean;
  toggle: () => void;
};

const AudioCtx = createContext<Ctx | null>(null);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // The <audio> element (and its ~2.8MB file) is only created the first
  // time it's actually needed — either the visitor interacts with the page
  // (and had audio playing last time) or taps the sound toggle. This keeps
  // the track out of the critical path on first load instead of racing
  // hero images and product data for bandwidth.
  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    const savedVolume = localStorage.getItem(VOLUME_KEY);
    audio.volume = savedVolume ? Number(savedVolume) : 0.5;

    audio.addEventListener("pause", () => {
      localStorage.setItem(STORAGE_KEY, "0");
      setPlaying(false);
    });
    audio.addEventListener("play", () => {
      localStorage.setItem(STORAGE_KEY, "1");
      setPlaying(true);
    });

    audioRef.current = audio;
    return audio;
  };

  // This provider lives above <Routes> so once created, the same <audio>
  // element survives navigation (Index → Shop → Product...), giving
  // continuous, uninterrupted playback across pages.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "0") return; // visitor muted it last time — do nothing

    const start = () => {
      INTERACTION_EVENTS.forEach((ev) => document.removeEventListener(ev, start));
      ensureAudio().play().catch(() => {});
    };
    INTERACTION_EVENTS.forEach((ev) => document.addEventListener(ev, start, { once: true, passive: true }));

    return () => {
      INTERACTION_EVENTS.forEach((ev) => document.removeEventListener(ev, start));
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    const audio = ensureAudio();
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
