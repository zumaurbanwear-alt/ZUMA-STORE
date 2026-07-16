import { useEffect, useState } from "react";

export const Loader = () => {
  const [hidden, setHidden] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setHidden(true), 30);
    // Most route transitions resolve well under this — showing a progress
    // indicator for those would be more distracting than reassuring (a
    // flash of "loading" on a near-instant switch reads as jank, not
    // helpfulness). Only surface feedback once a transition has taken long
    // enough that a blank screen starts to feel broken rather than fast —
    // this only ever fires on a slow connection or an un-preloaded route.
    const progressTimer = setTimeout(() => setShowProgress(true), 400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(progressTimer);
    };
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-[9000] bg-background pointer-events-none transition-opacity duration-[400ms] ${
          hidden ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden
      />
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-border/40 overflow-hidden z-[9001] pointer-events-none" aria-hidden>
          <div className="absolute top-0 h-full w-1/3 bg-foreground animate-route-progress" />
        </div>
      )}
    </>
  );
};
