DROP POLICY IF EXISTS "Allow service import sendit districts" ON public.sendit_districts;
DROP POLICY IF EXISTS "Allow update sendit districts" ON public.sendit_districts;

CREATE POLICY "admin_insert_sendit_districts"
ON public.sendit_districts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_update_sendit_districts"
ON public.sendit_districts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Lecture publique conservée : la liste des villes/districts est utilisée
-- côté client (checkout) pour calculer les frais de livraison.
