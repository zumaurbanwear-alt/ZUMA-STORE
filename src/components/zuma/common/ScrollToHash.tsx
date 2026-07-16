import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router does not scroll to #hash targets on client-side
 * navigation (only the browser does that on a full page load).
 * This component watches the current location and, whenever a
 * hash is present, scrolls smoothly to the matching element once
 * it exists in the DOM (retries briefly since the target page's
 * content may still be mounting/loading, e.g. products fetch).
 */
export const ScrollToHash = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }

    const id = hash.replace("#", "");
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryScroll, 100);
      }
    };
    tryScroll();
  }, [pathname, hash]);

  return null;
};
