-- Add Sendit shipping integration columns to public.orders
-- (admin_orders_full view already references these columns as of
-- 20260717000000_update_admin_orders_full_sendit.sql — this migration
-- ensures the underlying table actually has them.)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sendit_order_id text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipping_status text,
  ADD COLUMN IF NOT EXISTS shipping_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipping_label_url text;
