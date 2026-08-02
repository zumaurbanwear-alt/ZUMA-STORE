import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Trash2, ChevronDown, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ProductImage = {
  id: string;
  color: string | null;
  side: string | null;
  url: string;
  position: number;
};

type Side = "front" | "back" | "model_front" | "model_back";

const SIDES: { key: Side; label: string; position: number; fileSlug: string }[] = [
  { key: "front", label: "T-shirt face", position: 0, fileSlug: "front" },
  { key: "back", label: "T-shirt dos", position: 1, fileSlug: "back" },
  { key: "model_front", label: "Mannequin face", position: 2, fileSlug: "model-front" },
  { key: "model_back", label: "Mannequin dos", position: 3, fileSlug: "model-back" },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Redimensionne et recompresse en WebP côté navigateur avant l'upload —
// le site sert les images telles quelles (voir imageUtils.ts : un ancien
// essai de compression automatique côté serveur dégradait la qualité,
// notamment sur les couleurs sombres), donc l'optimisation doit se faire
// ici, une fois, avant l'envoi.
// Redimensionne et recompresse en WebP côté navigateur avant l'upload —
// le site sert les images telles quelles (voir imageUtils.ts : un ancien
// essai de compression automatique côté serveur dégradait la qualité,
// notamment sur les couleurs sombres), donc l'optimisation doit se faire
// ici, une fois, avant l'envoi. Les photos déjà dans le bucket font toutes
// entre 100 et 158 Ko — on vise donc un plafond strict de 170 Ko, quitte à
// baisser la qualité (puis la résolution) jusqu'à passer sous la barre,
// plutôt qu'une qualité fixe qui ne garantirait rien sur une photo plus
// complexe (mannequin avec fond, texture...).
const MAX_DIMENSION = 1600;
const MIN_DIMENSION = 800;
const MAX_BYTES = 170 * 1024;

const drawToBlob = (
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas non supporté"));
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression échouée"))),
      "image/webp",
      quality
    );
  });

const compressImage = async (file: File): Promise<Blob> => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image illisible"));
    };
    image.src = objectUrl;
  });

  let dimension = MAX_DIMENSION;

  while (true) {
    let { width, height } = img;
    if (width > dimension || height > dimension) {
      if (width > height) {
        height = Math.round((height * dimension) / width);
        width = dimension;
      } else {
        width = Math.round((width * dimension) / height);
        height = dimension;
      }
    }

    // Descend la qualité par paliers jusqu'à passer sous 170 Ko.
    let quality = 0.85;
    let blob = await drawToBlob(img, width, height, quality);

    while (blob.size > MAX_BYTES && quality > 0.4) {
      quality -= 0.1;
      blob = await drawToBlob(img, width, height, quality);
    }

    if (blob.size <= MAX_BYTES || dimension <= MIN_DIMENSION) {
      return blob;
    }

    // Toujours trop lourd même à qualité minimale : on réduit la résolution
    // et on recommence.
    dimension = Math.round(dimension * 0.85);
  }
};

export const AdminProductImages = ({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadColor, setUploadColor] = useState("");
  const [uploadSide, setUploadSide] = useState<Side>("front");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);

    const [imagesRes, variantsRes] = await Promise.all([
      supabase
        .from("product_images")
        .select("id, color, side, url, position")
        .eq("product_id", productId)
        .order("color", { ascending: true }),
      supabase
        .from("product_variants")
        .select("color")
        .eq("product_id", productId),
    ]);

    if (imagesRes.error) {
      console.error(imagesRes.error);
      toast.error("Erreur chargement images");
    }
    setImages(imagesRes.data ?? []);

    const variantColors = Array.from(
      new Set((variantsRes.data ?? []).map((v) => v.color))
    ).sort();
    setColors(variantColors);
    if (!uploadColor && variantColors.length > 0) {
      setUploadColor(variantColors[0]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleFileSelected = async (file: File) => {
    if (!uploadColor) {
      toast.error("Ajoute d'abord une couleur dans les variantes ci-dessous.");
      return;
    }

    setUploading(true);

    let compressed: Blob;
    try {
      compressed = await compressImage(file);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de compression de l'image");
      setUploading(false);
      return;
    }

    const sideSlug = SIDES.find((s) => s.key === uploadSide)?.fileSlug ?? uploadSide;
    const path = `${slugify(productSlug)}-${slugify(uploadColor)}-${sideSlug}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, compressed, {
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      console.error(uploadError);
      toast.error("Erreur upload : " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    // Un seul visuel par couleur/côté : on retire l'ancien avant d'ajouter le nouveau.
    const existing = images.find(
      (img) => img.color === uploadColor && img.side === uploadSide
    );
    if (existing) {
      await supabase.from("product_images").delete().eq("id", existing.id);
    }

    const { error: insertError } = await supabase.from("product_images").insert({
      product_id: productId,
      color: uploadColor,
      side: uploadSide,
      url: publicUrlData.publicUrl,
      position: SIDES.find((s) => s.key === uploadSide)?.position ?? 0,
    });

    if (insertError) {
      console.error(insertError);
      toast.error("Erreur enregistrement image");
    } else {
      toast.success(`Image ${uploadColor} / ${uploadSide} ajoutée`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  };

  const removeImage = async (image: ProductImage) => {
    if (!confirm(`Supprimer cette image (${image.color} / ${image.side}) ?`)) return;
    const { error } = await supabase.from("product_images").delete().eq("id", image.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  if (loading) {
    return <div className="text-[10px] text-muted-foreground py-3">Chargement des images...</div>;
  }

  const groupedByColor = colors.map((color) => ({
    color,
    bySide: SIDES.map((s) => ({
      side: s,
      img: images.find((img) => img.color === color && img.side === s.key),
    })),
  }));

  return (
    <div className="col-span-2 border border-border p-3 mt-2">
      <div className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
        Photos par couleur
      </div>

      {colors.length === 0 ? (
        <div className="text-[10px] text-muted-foreground mb-3">
          Ajoute d'abord une couleur dans les variantes ci-dessous pour pouvoir uploader ses photos.
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {groupedByColor.map(({ color, bySide }) => (
              <div key={color} className="flex items-center gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <span className="text-[10px] uppercase font-medium w-20 shrink-0">{color}</span>

                <div className="flex gap-2 flex-1 flex-wrap">
                  {bySide.map(({ side, img }) => (
                    <div key={side.key} className="flex flex-col items-center gap-1">
                      <div className="w-14 h-14 border border-border bg-background flex items-center justify-center overflow-hidden">
                        {img ? (
                          <img src={img.url} alt={`${color} ${side.label}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[7px] text-muted-foreground uppercase text-center leading-tight px-1">
                            {side.label}
                          </span>
                        )}
                      </div>
                      {img && (
                        <button
                          onClick={() => removeImage(img)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5 items-center pt-2 border-t border-border">
            <div className="relative">
              <select
                value={uploadColor}
                onChange={(e) => setUploadColor(e.target.value)}
                className="appearance-none border border-border bg-transparent pl-2 pr-7 py-1 text-[10px]"
              >
                {colors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={uploadSide}
                onChange={(e) => setUploadSide(e.target.value as Side)}
                className="appearance-none border border-border bg-transparent pl-2 pr-7 py-1 text-[10px]"
              >
                {SIDES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 border border-primary px-3 py-1 text-[9px] uppercase tracking-[0.1em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3 h-3" />
              {uploading ? "Envoi..." : "Choisir une photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};
