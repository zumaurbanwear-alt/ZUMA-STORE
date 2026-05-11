ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_orders" ON public.orders;
DROP POLICY IF EXISTS "Web visitors create orders" ON public.orders;
CREATE POLICY "Visitors create valid orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(customer_name)) >= 2
  AND char_length(btrim(customer_name)) <= 120
  AND char_length(btrim(customer_email)) >= 5
  AND char_length(btrim(customer_email)) <= 255
  AND char_length(btrim(customer_phone)) >= 6
  AND char_length(btrim(customer_phone)) <= 30
  AND char_length(btrim(customer_address)) >= 5
  AND char_length(btrim(customer_address)) <= 500
  AND char_length(btrim(customer_city)) >= 2
  AND char_length(btrim(customer_city)) <= 80
  AND payment_method = 'cash_on_delivery'
  AND status = 'pending'
  AND total >= 0
);

DROP POLICY IF EXISTS "insert_order_items" ON public.order_items;
DROP POLICY IF EXISTS "Web visitors create order items" ON public.order_items;
DROP POLICY IF EXISTS "Visitors create items for fresh orders" ON public.order_items;
CREATE POLICY "Visitors create valid fresh order items"
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
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.created_at > now() - interval '10 minutes'
  )
);