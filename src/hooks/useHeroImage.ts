import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HERO_IMAGE_KEY,
  HERO_QUERY_KEY,
  isHeroImageContent,
  readHeroCache,
  writeHeroCache,
  type HeroImageContent,
} from "@/lib/heroImage";

/** Lit la photo de hero personnalisée (null = aucune, on garde l'image d'origine). */
export const fetchHeroImage = async (): Promise<HeroImageContent | null> => {
  const { data: row, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", HERO_IMAGE_KEY)
    .maybeSingle();
  if (error) throw error;
  const value = row && isHeroImageContent(row.data) ? row.data : null;
  writeHeroCache(value);
  return value;
};

/**
 * `ready` = on sait quelle image afficher (cache local, réponse de Supabase, ou
 * erreur → image d'origine). Tant que ce n'est pas le cas, la page d'accueil
 * n'affiche pas de photo, pour ne pas montrer l'ancienne puis la nouvelle.
 */
export const useHeroImage = () => {
  const { data, isError } = useQuery({
    queryKey: HERO_QUERY_KEY,
    queryFn: fetchHeroImage,
    initialData: readHeroCache,
    initialDataUpdatedAt: 0, // données du cache = périmées : on revérifie aussitôt
    staleTime: 60_000,
    retry: 1,
  });
  return { hero: data ?? null, ready: data !== undefined || isError };
};
