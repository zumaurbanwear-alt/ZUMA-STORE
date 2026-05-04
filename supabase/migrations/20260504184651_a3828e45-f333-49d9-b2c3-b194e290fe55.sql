-- 1. Drop the permissive public insert policy on orders; replace with validated public insert
DROP POLICY IF EXISTS "insert_orders" ON public.orders;

-- Ensure the validated insert policy exists (it does per migration history but recreate idempotently)
DROP POLICY IF EXISTS "Web visitors create orders" ON public.orders;
CREATE POLICY "Web visitors create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(customer_name) >= 2 AND char_length(customer_name) <= 120
  AND char_length(customer_email) >= 5 AND char_length(customer_email) <= 255
  AND char_length(customer_phone) >= 6 AND char_length(customer_phone) <= 30
  AND char_length(customer_address) >= 5 AND char_length(customer_address) <= 500
  AND total >= 0
);

-- 2. Server-side recompute of orders.total from order_items
CREATE OR REPLACE FUNCTION public.recompute_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_total
  FROM public.order_items WHERE order_id = v_order_id;
  UPDATE public.orders SET total = v_total WHERE id = v_order_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_order_total_ins ON public.order_items;
CREATE TRIGGER trg_recompute_order_total_ins
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_order_total();

-- 3. Tighten order_items insert: must reference an order created in the last 10 minutes (or be admin)
DROP POLICY IF EXISTS "Web visitors create order items" ON public.order_items;
CREATE POLICY "Visitors create items for fresh orders"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  quantity > 0
  AND unit_price >= 0
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.created_at > now() - interval '10 minutes'
  )
);

-- 4. Hide internal stock from public reads via a SECURITY INVOKER view
DROP POLICY IF EXISTS "Anyone reads visible products" ON public.products;
-- Keep public read but exclude stock by exposing a view; still public can read the table without stock via the view
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = true) AS
SELECT id, slug, name, description, price, category, image_url,
       is_visible, sort_order, created_at, updated_at
FROM public.products
WHERE is_visible = true;

GRANT SELECT ON public.products_public TO anon, authenticated;

-- Re-add a tighter public select policy on products that exposes stock only as a boolean derivative is not possible at row level,
-- so we keep table-level public read for backwards compatibility but document the recommended path is the view.
CREATE POLICY "Anyone reads visible products"
ON public.products
FOR SELECT
TO public
USING (is_visible = true);

-- 5. Remove the SECURITY DEFINER-style admin view that leaks PII via view
DROP VIEW IF EXISTS public.orders_full;

-- 6. Restrict product-image uploads to admins only
DROP POLICY IF EXISTS "Allow upload product images" ON storage.objects;
CREATE POLICY "Admins upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Also restrict update/delete on the bucket to admins
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 7. Lock down has_role EXECUTE: only allow security-relevant roles to call it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;