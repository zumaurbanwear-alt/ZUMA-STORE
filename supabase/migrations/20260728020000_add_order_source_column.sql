-- Tags orders created through the admin "commande manuelle" modal,
-- regardless of whether the delivery ends up "manual" or "sendit".
-- shipping_provider alone can't distinguish these: the "sendit" sub-mode
-- deliberately leaves shipping_provider null, same as a normal checkout
-- order, so a dedicated marker is needed to scope admin-only features
-- (like post-creation promo pricing) to admin-created orders only.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source text;
