import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HERO_SLOT,
  isHeroImageContent,
  readHeroCache,
  writeHeroCache,
  type HeroImageContent,
  type SiteImageSlot,
} from "@/lib/heroImage";

/** Lit la photo personnalisée d'un emplacement (null = aucune, on garde l'image d'origine). */
export const fetchHeroImage = async (slot: SiteImageSlot = HERO_SLOT): Promise<HeroImageContent | null> => {
  const { data: row, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", slot.key)
    .maybeSingle();
  if (error) throw error;
  const value = row && isHeroImageContent(row.data) ? row.data : null;
  writeHeroCache(value, slot);
  return value;
};

/**
 * `ready` = on sait quelle image afficher (cache local, réponse de Supabase, ou
 * erreur → image d'origine). Tant que ce n'est pas le cas, on n'affiche pas de
 * photo, pour ne pas montrer l'ancienne puis la nouvelle.
 */
export const useHeroImage = (slot: SiteImageSlot = HERO_SLOT) => {
  const { data, isError } = useQuery({
    queryKey: slot.queryKey,
    queryFn: () => fetchHeroImage(slot),
    initialData: () => readHeroCache(slot),
    initialDataUpdatedAt: 0, // données du cache = périmées : on revérifie aussitôt
    staleTime: 60_000,
    retry: 1,
  });
  return { hero: data ?? null, ready: data !== undefined || isError };
};
