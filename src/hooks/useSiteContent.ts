import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Charge un bloc de contenu éditorial depuis site_content par sa clé.
 * Si aucune ligne n'existe en base (ou en cas d'erreur), on garde le
 * contenu par défaut codé en dur passé en 2e argument — donc rien ne
 * casse jamais côté client, avant/pendant/après une édition admin.
 */
export const useSiteContent = <T,>(key: string, fallback: T): T => {
  const [data, setData] = useState<T>(fallback);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("site_content")
      .select("data")
      .eq("key", key)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (cancelled) return;
        if (error || !row) return; // garde le fallback
        setData(row.data as T);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
};
