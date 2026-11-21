// Photo du hero (page d'accueil) modifiable depuis l'admin.
//
// Fonctionnement : l'admin choisit UNE photo + un point d'intérêt (focal). Le
// navigateur en fabrique 3 versions recadrées et compressées (téléphone, iPad
// portrait, ordinateur), les envoie dans Supabase Storage, puis enregistre leurs
// URLs dans site_content (clé "homepage_hero_image"). La page d'accueil lit
// cette ligne ; s'il n'y en a pas, elle garde l'image d'origine du site.

export const HERO_IMAGE_KEY = "homepage_hero_image";
export const HERO_STORAGE_BUCKET = "product-images";
export const HERO_STORAGE_FOLDER = "site/hero";
export const HERO_QUERY_KEY = ["hero-image"] as const;

export type HeroVariantName = "mobile" | "tablet" | "desktop";
export type HeroFocal = { x: number; y: number }; // 0..1, comme object-position

export type HeroImageContent = {
  mobile: string;
  tablet: string;
  desktop: string;
  focal: HeroFocal;
  /** Chemins dans le bucket, pour pouvoir supprimer les anciens fichiers. */
  paths?: string[];
  updatedAt?: string;
};

export const HERO_VARIANT_NAMES: HeroVariantName[] = ["mobile", "tablet", "desktop"];

export const HERO_VARIANTS: Record<
  HeroVariantName,
  { width: number; height: number; maxBytes: number; minWidth: number; label: string }
> = {
  mobile: { width: 1080, height: 1920, maxBytes: 230 * 1024, minWidth: 720, label: "Téléphone (9:16)" },
  tablet: { width: 1536, height: 2048, maxBytes: 320 * 1024, minWidth: 1024, label: "iPad portrait (3:4)" },
  desktop: { width: 2560, height: 1440, maxBytes: 450 * 1024, minWidth: 1600, label: "Ordinateur / iPad paysage (16:9)" },
};

// Doivent rester identiques aux <source media> du composant HeroPicture.
export const HERO_MEDIA = {
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1279px) and (orientation: portrait)",
};

// Un « emplacement » = une photo modifiable depuis l'admin (hero, email gate...).
export type SiteImageSlot = {
  key: string; // ligne de site_content
  queryKey: readonly string[]; // cache react-query
  cacheKey: string; // cache localStorage
  storageFolder: string; // dossier dans le bucket
};

export const HERO_SLOT: SiteImageSlot = {
  key: HERO_IMAGE_KEY,
  queryKey: HERO_QUERY_KEY,
  cacheKey: "zuma:hero-image:v1",
  storageFolder: HERO_STORAGE_FOLDER,
};

export const EMAIL_GATE_SLOT: SiteImageSlot = {
  key: "email_gate_image",
  queryKey: ["email-gate-image"],
  cacheKey: "zuma:email-gate-image:v1",
  storageFolder: "site/email-gate",
};

// Image de l'email gate avant toute personnalisation (fichier déjà dans Supabase).
export const EMAIL_GATE_FALLBACK_URL =
  "https://drkeggribqajjuktxhrj.supabase.co/storage/v1/object/public/product-images/email-gate-bg.webp";

export const DEFAULT_FOCAL: HeroFocal = { x: 0.5, y: 0.5 };

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

export const focalToPosition = (f: HeroFocal) => `${Math.round(clamp01(f.x) * 100)}% ${Math.round(clamp01(f.y) * 100)}%`;

/**
 * Zone de la photo source à garder pour un format cible. Même logique que
 * CSS object-position : le point focal reste à la même position relative dans le
 * recadrage, donc l'aperçu de l'admin et le rendu final concordent. Jamais
 * d'agrandissement : si la source est plus petite que la cible, on garde sa taille.
 */
export const computeCrop = (
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  focal: HeroFocal
) => {
  const aspect = targetW / targetH;
  let sw = srcW;
  let sh = srcH;
  if (srcW / srcH > aspect) sw = Math.min(srcW, Math.round(srcH * aspect));
  else sh = Math.min(srcH, Math.round(srcW / aspect));
  const sx = Math.round(clamp01(focal.x) * (srcW - sw));
  const sy = Math.round(clamp01(focal.y) * (srcH - sh));
  const scale = Math.min(1, targetW / sw);
  return { sx, sy, sw, sh, outW: Math.round(sw * scale), outH: Math.round(sh * scale) };
};

export const isHeroImageContent = (v: unknown): v is HeroImageContent => {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const url = (s: unknown) => typeof s === "string" && /^https:\/\//.test(s);
  const f = o.focal as Record<string, unknown> | undefined;
  return (
    url(o.mobile) &&
    url(o.tablet) &&
    url(o.desktop) &&
    !!f &&
    typeof f.x === "number" &&
    typeof f.y === "number"
  );
};

// --- Cache local : évite que l'ancienne photo clignote avant la nouvelle chez
// les visiteurs qui reviennent. `null` = « pas de photo personnalisée ».
export const readHeroCache = (slot: SiteImageSlot = HERO_SLOT): HeroImageContent | null | undefined => {
  try {
    const raw = window.localStorage.getItem(slot.cacheKey);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed === null) return null;
    return isHeroImageContent(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const writeHeroCache = (value: HeroImageContent | null, slot: SiteImageSlot = HERO_SLOT) => {
  try {
    window.localStorage.setItem(slot.cacheKey, JSON.stringify(value));
  } catch {
    /* stockage indisponible : sans importance */
  }
};

// --- Encodage (navigateur uniquement) ---------------------------------------

export type EncodedVariant = { blob: Blob; ext: "webp" | "jpg"; width: number; height: number };

const QUALITIES = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6];

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export const loadImageFromFile = (file: File) =>
  new Promise<{ img: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible (essaie un JPG, PNG ou WebP)."));
    };
    img.src = url;
  });

/** Recadre autour du point focal, redimensionne, puis compresse sous la limite de poids. */
export const encodeVariant = async (
  img: HTMLImageElement,
  focal: HeroFocal,
  name: HeroVariantName
): Promise<EncodedVariant> => {
  const spec = HERO_VARIANTS[name];
  const crop = computeCrop(img.naturalWidth, img.naturalHeight, spec.width, spec.height, focal);
  let outW = crop.outW;
  let outH = crop.outH;
  let best: EncodedVariant | null = null;
  let useJpeg = false; // navigateurs qui ne savent pas encoder en WebP

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non supporté par ce navigateur.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, outW, outH);

    for (const q of QUALITIES) {
      let blob = await canvasToBlob(canvas, useJpeg ? "image/jpeg" : "image/webp", q);
      if (blob && !useJpeg && blob.type !== "image/webp") {
        useJpeg = true;
        blob = await canvasToBlob(canvas, "image/jpeg", q);
      }
      if (!blob) throw new Error("Compression échouée.");
      const candidate: EncodedVariant = {
        blob,
        ext: blob.type === "image/webp" ? "webp" : "jpg",
        width: outW,
        height: outH,
      };
      if (!best || blob.size < best.blob.size) best = candidate;
      if (blob.size <= spec.maxBytes) return candidate;
    }

    if (outW * 0.85 < spec.minWidth) break;
    outW = Math.round(outW * 0.85);
    outH = Math.round(outH * 0.85);
  }

  if (!best) throw new Error("Compression échouée.");
  return best;
};
