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

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Create the <audio> element once. Because this provider lives
  // above <Routes>, it never unmounts on navigation — the same
  // element keeps playing continuously as the user moves between
  // pages (Index → Shop → Product...).
  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    const savedVolume = localStorage.getItem(VOLUME_KEY);
    audio.volume = savedVolume ? Number(savedVolume) : 0.5;
    audioRef.current = audio;

    const wantedToPlay = localStorage.getItem(STORAGE_KEY) === "1";
    if (wantedToPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => {
        setPlaying(true);
        localStorage.setItem(STORAGE_KEY, "1");
      }).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
      localStorage.setItem(STORAGE_KEY, "0");
    }
  };

  return <AudioCtx.Provider value={{ playing, toggle }}>{children}</AudioCtx.Provider>;
};

export const useAudio = () => {
  const v = useContext(AudioCtx);
  if (!v) throw new Error("useAudio must be used inside AudioProvider");
  return v;
};
