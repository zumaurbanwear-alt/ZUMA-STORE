import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";

const calc = (target: number) => {
  const d = target - Date.now();
  if (d <= 0) return null;
  return {
    days: Math.floor(d / 86400000),
    hours: Math.floor((d % 86400000) / 3600000),
    minutes: Math.floor((d % 3600000) / 60000),
    seconds: Math.floor((d % 60000) / 1000),
  };
};

export const Countdown = ({ targetIso, headline }: { targetIso: string; headline: string }) => {
  const { t } = useLang();
  const target = new Date(targetIso).getTime();
  const [tt, setT] = useState(() => calc(target));
  useEffect(() => {
    const i = setInterval(() => setT(calc(target)), 1000);
    return () => clearInterval(i);
  }, [target]);

  // Conditional: only render if drop is in the future
  if (!tt) return null;

  const items = [
    { v: tt.days, l: t("days") },
    { v: tt.hours, l: t("hrs") },
    { v: tt.minutes, l: t("min") },
    { v: tt.seconds, l: t("sec") },
  ];

  return (
    <section className="px-6 md:px-10 py-20 text-center border-b border-border reveal">
      <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.3em] uppercase text-foreground mb-7">
        <span className="w-2 h-2 bg-primary animate-pulse" />
        {t("systemStatus")}
      </div>
      <h2 className="font-display text-4xl md:text-7xl tracking-[0.25em] text-foreground mb-8">{headline}</h2>
      <div className="grid grid-cols-4 gap-3 md:gap-6 max-w-3xl mx-auto">
        {items.map((it) => (
          <div key={it.l} className="border border-border/50 py-5 md:py-8 px-2 md:px-4 flex flex-col items-center gap-2">
            <div className="font-display text-3xl md:text-6xl text-foreground leading-none">
              {String(it.v).padStart(2, "0")}
            </div>
            <div className="text-[9px] md:text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{it.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
        {t("markCalendar")}
      </div>
    </section>
  );
};
