-- Add subtotal (products only) and shipping_fee (delivery cost by city) to orders.
-- "total" continues to be subtotal + shipping_fee, kept for backward compatibility.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal numeric(10,2),
  ADD COLUMN IF NOT EXISTS shipping_fee numeric(10,2) NOT NULL DEFAULT 0;

-- Backfill existing rows: no shipping fee data available historically,
-- so treat their whole recorded total as the subtotal.
UPDATE public.orders
SET subtotal = total
WHERE subtotal IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN subtotal SET NOT NULL;

-- Refresh admin_orders_full to expose the new columns to the admin dashboard.
DROP VIEW IF EXISTS public.admin_orders_full;

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
