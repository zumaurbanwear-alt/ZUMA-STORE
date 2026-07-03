DROP POLICY IF EXISTS "Visitors create valid fresh order items" ON public.order_items;
DROP POLICY IF EXISTS "insert_order_items" ON public.order_items;
DROP POLICY IF EXISTS "Web visitors create order items" ON public.order_items;
DROP POLICY IF EXISTS "Visitors create items for fresh orders" ON public.order_items;

CREATE POLICY "Visitors create valid order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  quantity > 0
  AND unit_price >= 0
  AND size IS NOT NULL
  AND btrim(size) <> ''
  AND color IS NOT NULL
  AND btrim(color) <> ''
);

NOTIFY pgrst, 'reload schema';