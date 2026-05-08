-- Sequences for short display IDs
CREATE SEQUENCE IF NOT EXISTS public.products_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.orders_display_seq START 1;

-- Add display_id columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

-- Backfill existing rows
UPDATE public.products
  SET display_id = LPAD(nextval('public.products_display_seq')::text, 5, '0')
  WHERE display_id IS NULL;

UPDATE public.orders
  SET display_id = LPAD(nextval('public.orders_display_seq')::text, 5, '0')
  WHERE display_id IS NULL;

-- Default for new rows
ALTER TABLE public.products
  ALTER COLUMN display_id SET DEFAULT LPAD(nextval('public.products_display_seq')::text, 5, '0');
ALTER TABLE public.products
  ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE public.orders
  ALTER COLUMN display_id SET DEFAULT LPAD(nextval('public.orders_display_seq')::text, 5, '0');
ALTER TABLE public.orders
  ALTER COLUMN display_id SET NOT NULL;

-- Unified admin view
CREATE OR REPLACE VIEW public.admin_orders_full
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
  oi.quantity,
  oi.unit_price,
  (oi.quantity * oi.unit_price) AS line_total
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
LEFT JOIN public.products p     ON p.id = oi.product_id
ORDER BY o.created_at DESC;

-- View inherits RLS from base tables thanks to security_invoker.
GRANT SELECT ON public.admin_orders_full TO authenticated;