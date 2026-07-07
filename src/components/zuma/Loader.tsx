import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";

export const Loader = () => {
  const { t } = useLang();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={`fixed inset-0 z-[9000] bg-background flex flex-col items-center justify-center gap-5 transition-all duration-1000 ${
        hidden ? "opacity-0 invisible" : "opacity-100 visible"
      }`}
    >
      <div className="font-display text-foreground animate-loader-in" style={{ fontSize: "clamp(52px,12vw,110px)", letterSpacing: "0.35em", paddingLeft: "0.4em" }}>
        ZÜMA
      </div>
      <div className="h-px bg-primary animate-loader-line max-w-[80vw] w-[80vw]" />
      <div className="text-[8px] tracking-[0.3em] uppercase text-muted-foreground font-mono">
        {t("initializingSystem")}
      </div>
    </div>
  );
};
