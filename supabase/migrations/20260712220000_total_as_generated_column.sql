-- "total" was a plain stored column, independent from subtotal/shipping_fee —
-- nothing enforced total = subtotal + shipping_fee, so it could drift out of
-- sync (a bug, a manual edit in the Table Editor, a future code path that
-- forgets to recompute it...). This makes the relationship a DB-level
-- guarantee instead of a convention the app has to remember to respect.

-- The view reads from orders.total, so it must be dropped before we can
-- change the column, then recreated identically afterwards.
DROP VIEW IF EXISTS public.admin_orders_full;

ALTER TABLE public.orders DROP COLUMN total;
ALTER TABLE public.orders
  ADD COLUMN total numeric(10,2) GENERATED ALWAYS AS (subtotal + shipping_fee) STORED;

CREATE VIEW public.admin_orders_full
WITH (security_invoker = true) AS
SELECT
  o.display_id        AS order_id,
  o.created_at,
  o.status,
  o.payment_method,
  o.subtotal,
  o.shipping_fee,
  o.total,
  o.customer_name,
  o.customer_email,
  o.customer_phone,
  o.customer_city,
  o.customer_address,
  o.notes,
  p.display_id        AS product_id,
  oi.product_name,
  oi.size,
  oi.color,
  oi.quantity,
  oi.unit_price,
  (oi.quantity * oi.unit_price) AS line_total
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
LEFT JOIN public.products p     ON p.id = oi.product_id
ORDER BY o.created_at DESC;

GRANT SELECT ON public.admin_orders_full TO authenticated;
