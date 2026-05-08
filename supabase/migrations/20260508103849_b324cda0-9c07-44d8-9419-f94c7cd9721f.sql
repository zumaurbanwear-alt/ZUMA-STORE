ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS color text;

DROP VIEW IF EXISTS public.admin_orders_full;

CREATE VIEW public.admin_orders_full
WITH (security_invoker = true) AS
SELECT
  o.display_id        AS order_id,
  o.created_at,
  o.status,
  o.payment_method,
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