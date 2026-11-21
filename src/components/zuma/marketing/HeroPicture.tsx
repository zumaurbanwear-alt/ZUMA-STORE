import { useState } from "react";
import heroDesktop from "@/assets/fw000/modeled-desktop.webp";
import heroMobile from "@/assets/fw000/modeled-mobile.webp";
import { HERO_MEDIA, focalToPosition, type HeroImageContent } from "@/lib/heroImage";

// Cadrage de l'image d'origine du site (celle fournie avec le code).
const BUNDLED_POSITION = "40% 15%";

type PictureFallback = { mobile: string; desktop: string; position: string };

const BUNDLED_FALLBACK: PictureFallback = { mobile: heroMobile, desktop: heroDesktop, position: BUNDLED_POSITION };

/**
 * Photo plein écran du hero. Utilise la photo personnalisée de l'admin si elle
 * existe (3 versions déjà recadrées : téléphone / iPad portrait / ordinateur),
 * sinon l'image d'origine. Si la photo personnalisée ne charge pas, repli
 * automatique sur l'image d'origine.
 */
export const HeroPicture = ({
  hero,
  fallback = BUNDLED_FALLBACK,
  className = "absolute inset-0 w-full h-full object-cover animate-hero-reveal",
}: {
  hero: HeroImageContent | null;
  /** Image affichée s'il n'y a pas de photo personnalisée (ou si elle ne charge pas). */
  fallback?: PictureFallback;
  className?: string;
}) => {
  const [failedDesktopUrl, setFailedDesktopUrl] = useState<string | null>(null);
  const custom = hero && failedDesktopUrl !== hero.desktop ? hero : null;

  const mobile = custom ? custom.mobile : fallback.mobile;
  const tablet = custom ? custom.tablet : null;
  const desktop = custom ? custom.desktop : fallback.desktop;
  const position = custom ? focalToPosition(custom.focal) : fallback.position;

  return (
    <picture key={custom ? custom.desktop : "bundled"}>
      <source media={HERO_MEDIA.mobile} srcSet={mobile} />
      {tablet && <source media={HERO_MEDIA.tablet} srcSet={tablet} />}
      <img
        src={desktop}
        alt=""
        className={className}
        style={{ objectPosition: position }}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={() => {
          if (hero && !failedDesktopUrl) setFailedDesktopUrl(hero.desktop);
        }}
      />
    </picture>
  );
};
