import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import heroDesktopBundled from "@/assets/fw000/modeled-desktop.webp";
import { fetchHeroImage, useHeroImage } from "@/hooks/useHeroImage";
import {
  DEFAULT_FOCAL,
  HERO_SLOT,
  HERO_STORAGE_BUCKET,
  HERO_VARIANTS,
  HERO_VARIANT_NAMES,
  encodeVariant,
  focalToPosition,
  loadImageFromFile,
  writeHeroCache,
  type EncodedVariant,
  type HeroFocal,
  type HeroImageContent,
  type HeroVariantName,
  type SiteImageSlot,
} from "@/lib/heroImage";

const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const kb = (bytes: number) => `${Math.round(bytes / 1024)} Ko`;

// Largeur des aperçus (hauteur déduite du format réel de chaque version).
const PREVIEW: Record<HeroVariantName, { aspect: string; width: number }> = {
  mobile: { aspect: "9 / 16", width: 84 },
  tablet: { aspect: "3 / 4", width: 120 },
  desktop: { aspect: "16 / 9", width: 220 },
};

export const AdminHeroImage = ({
  slot = HERO_SLOT,
  title = "Photo du hero (accueil)",
  fallbackUrl = heroDesktopBundled,
  fallbackPosition = "40% 15%",
}: {
  slot?: SiteImageSlot;
  title?: string;
  /** Image affichée tant qu'aucune photo personnalisée n'est publiée. */
  fallbackUrl?: string;
  fallbackPosition?: string;
}) => {
  const queryClient = useQueryClient();
  const { hero: current } = useHeroImage(slot);

  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [focal, setFocal] = useState<HeroFocal>(DEFAULT_FOCAL);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Record<HeroVariantName, EncodedVariant> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Libère l'URL temporaire de l'aperçu quand on change de photo ou qu'on quitte.
  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
    };
  }, [srcUrl]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Ce fichier n'est pas une image.");
      return;
    }
    if (f.size > MAX_SOURCE_BYTES) {
      toast.error("Image trop lourde (30 Mo maximum).");
      return;
    }
    try {
      const loaded = await loadImageFromFile(f);
      setFile(f);
      setImg(loaded.img);
      setSrcUrl(loaded.url);
      setFocal(DEFAULT_FOCAL);
      setReport(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image illisible.");
    }
  };

  const setFocalFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = pickerRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    setFocal({
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    });
  };

  const removeFiles = async (paths?: string[]) => {
    if (!paths || paths.length === 0) return;
    const { error } = await supabase.storage.from(HERO_STORAGE_BUCKET).remove(paths);
    if (error) console.error("Suppression anciens fichiers hero :", error);
  };

  const publish = async () => {
    if (!img || !file) return;
    setBusy(true);
    const uploadedPaths: string[] = [];
    try {
      // 1) 3 versions recadrées autour du point focal, compressées
      const encoded = {} as Record<HeroVariantName, EncodedVariant>;
      for (const name of HERO_VARIANT_NAMES) {
        encoded[name] = await encodeVariant(img, focal, name);
      }

      // 2) Envoi dans Supabase Storage (noms uniques => pas de cache périmé)
      const stamp = Date.now();
      const urls = {} as Record<HeroVariantName, string>;
      for (const name of HERO_VARIANT_NAMES) {
        const { blob, ext } = encoded[name];
        const path = `${slot.storageFolder}/img-${stamp}-${name}.${ext}`;
        const { error } = await supabase.storage
          .from(HERO_STORAGE_BUCKET)
          .upload(path, blob, { upsert: false, contentType: blob.type, cacheControl: "31536000" });
        if (error) throw new Error("Upload : " + error.message);
        uploadedPaths.push(path);
        urls[name] = supabase.storage.from(HERO_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      // 3) Enregistrement dans site_content (le site la lit immédiatement)
      const previous = await fetchHeroImage(slot).catch(() => null);
      const content: HeroImageContent = {
        mobile: urls.mobile,
        tablet: urls.tablet,
        desktop: urls.desktop,
        focal,
        paths: uploadedPaths,
        updatedAt: new Date().toISOString(),
      };
      const { error: saveError } = await supabase
        .from("site_content")
        .upsert({ key: slot.key, data: content as never }, { onConflict: "key" });
      if (saveError) throw new Error("Enregistrement : " + saveError.message);

      // 4) Ménage : on supprime les anciens fichiers (sans bloquer en cas d'échec)
      await removeFiles(previous?.paths);

      writeHeroCache(content, slot);
      queryClient.setQueryData(slot.queryKey, content);
      setReport(encoded);
      toast.success("Nouvelle photo publiée — visible tout de suite sur le site.");
    } catch (e) {
      await removeFiles(uploadedPaths); // annule les fichiers déjà envoyés
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Échec de la publication.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm("Revenir à l'image d'origine du site ?")) return;
    setBusy(true);
    try {
      const previous = await fetchHeroImage(slot).catch(() => null);
      const { error } = await supabase.from("site_content").delete().eq("key", slot.key);
      if (error) throw new Error(error.message);
      await removeFiles(previous?.paths);
      writeHeroCache(null, slot);
      queryClient.setQueryData(slot.queryKey, null);
      setReport(null);
      toast.success("Image d'origine rétablie.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec.");
    } finally {
      setBusy(false);
    }
  };

  const small = img && img.naturalWidth < 1600;

  return (
    <div className="border border-border p-3 mb-4">
      <div className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
        {title}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-24 h-14 border border-border bg-background overflow-hidden shrink-0">
          <img
            src={current?.desktop ?? fallbackUrl}
            alt="Photo actuelle"
            className="w-full h-full object-cover"
            style={{ objectPosition: current ? focalToPosition(current.focal) : fallbackPosition }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="uppercase tracking-[0.15em] text-foreground">Actuellement</span>
          <br />
          {current ? "Photo personnalisée" : "Image d'origine du site"}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border border-primary text-primary px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          Choisir une nouvelle photo
        </button>
        {current && (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="border border-border text-muted-foreground px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:text-destructive disabled:opacity-50"
          >
            Revenir à l'image d'origine
          </button>
        )}
      </div>

      {img && srcUrl && file && (
        <div className="mt-4">
          <div className="text-[10px] text-muted-foreground mb-2">
            {file.name} — {img.naturalWidth}×{img.naturalHeight} px, {(file.size / 1024 / 1024).toFixed(1)} Mo
          </div>
          {small && (
            <div className="text-[10px] text-amber-600 mb-2">
              Photo un peu petite : elle ne sera pas agrandie, elle peut paraître moins nette sur grand
              écran. Idéal : 2500 px de large ou plus.
            </div>
          )}

          <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
            1. Clique (ou glisse) sur le point à garder bien visible
          </div>
          <div
            ref={pickerRef}
            className="relative inline-block max-w-full cursor-crosshair select-none"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setFocalFromPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0) setFocalFromPointer(e);
            }}
          >
            <img
              src={srcUrl}
              alt="Photo à recadrer"
              draggable={false}
              className="block max-w-full max-h-[320px] border border-border"
            />
            <span
              className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white bg-primary/70 shadow pointer-events-none"
              style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
            />
          </div>

          <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mt-4 mb-2">
            2. Aperçu du résultat
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {HERO_VARIANT_NAMES.map((name) => (
              <div key={name}>
                <div
                  className="border border-border overflow-hidden bg-background"
                  style={{ width: PREVIEW[name].width, aspectRatio: PREVIEW[name].aspect }}
                >
                  <img
                    src={srcUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ objectPosition: focalToPosition(focal) }}
                  />
                </div>
                <div className="text-[8px] text-muted-foreground mt-1 max-w-[220px]">
                  {HERO_VARIANTS[name].label}
                  {report && (
                    <span className="block">
                      {report[name].width}×{report[name].height} — {kb(report[name].blob.size)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="mt-4 border border-primary text-primary px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Optimisation en cours..." : "Optimiser et publier"}
          </button>
        </div>
      )}
    </div>
  );
};
