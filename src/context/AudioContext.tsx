import { createContext, useContext, useEffect, useRef, ReactNode } from "react";

// Change the file (keep it at /public/audio/theme.mp3) to swap the track.
const AUDIO_SRC = "/audio/theme.mp3";
const STORAGE_KEY = "zuma-audio-playing";
const VOLUME_KEY = "zuma-audio-volume";

type Ctx = {};

const AudioCtx = createContext<Ctx | null>(null);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Created once — this provider lives above <Routes> so the same
  // <audio> element survives navigation (Index → Shop → Product...),
  // giving continuous, uninterrupted playback across pages.
  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    const savedVolume = localStorage.getItem(VOLUME_KEY);
    audio.volume = savedVolume ? Number(savedVolume) : 0.5;
    audioRef.current = audio;

    const markPlaying = () => localStorage.setItem(STORAGE_KEY, "1");

    const armFallback = () => {
      const events: (keyof DocumentEventMap)[] = ["click", "touchstart", "keydown", "scroll"];
      const start = () => {
        events.forEach((ev) => document.removeEventListener(ev, start));
        audio.play().then(markPlaying).catch(() => {});
      };
      events.forEach((ev) => document.addEventListener(ev, start, { once: true, passive: true }));
    };

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "0") {
      audio.play().then(markPlaying).catch(armFallback);
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  return <AudioCtx.Provider value={{}}>{children}</AudioCtx.Provider>;
};

export const useAudio = () => {
  const v = useContext(AudioCtx);
  if (!v) throw new Error("useAudio must be used inside AudioProvider");
  return v;
};
