import { useAudio } from "@/context/AudioContext";
import { useLang } from "@/context/LanguageContext";

export const AudioToggle = () => {
  const { playing, toggle } = useAudio();
  const { t } = useLang();

  return (
    <button
      onClick={toggle}
      aria-label={t("toggleSound")}
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-3 py-2 bg-background border border-primary text-primary-hi text-[7px] tracking-[0.22em] uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <span className="flex items-end gap-[2px] h-[9px]">
        <span
          className={`w-[2px] bg-current ${playing ? "animate-[zuma-bar_0.9s_ease-in-out_infinite]" : ""}`}
          style={{ height: playing ? undefined : "3px", animationDelay: "0s" }}
        />
        <span
          className={`w-[2px] bg-current ${playing ? "animate-[zuma-bar_0.9s_ease-in-out_infinite]" : ""}`}
          style={{ height: playing ? undefined : "3px", animationDelay: "0.15s" }}
        />
        <span
          className={`w-[2px] bg-current ${playing ? "animate-[zuma-bar_0.9s_ease-in-out_infinite]" : ""}`}
          style={{ height: playing ? undefined : "3px", animationDelay: "0.3s" }}
        />
      </span>
      <span>{playing ? t("soundPause") : t("soundOn")}</span>
    </button>
  );
};
