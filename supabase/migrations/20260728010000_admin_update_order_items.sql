-- Admins had SELECT/INSERT on order_items but no UPDATE policy, so any
-- admin-side price correction (e.g. manual "PROMOTION" pricing) was
-- silently rejected by RLS. Mirrors the existing "Admins update orders"
-- policy — same trust boundary (has_role admin), just extended to the
-- line-item rows.
--
-- Note: order_items.unit_price is still forced to the catalog price on
-- INSERT by set_order_item_unit_price() (20260713020000) — that trigger
-- only fires BEFORE INSERT, so it doesn't touch this UPDATE path. Promo
-- pricing is applied as a follow-up UPDATE after the normal insert, from
-- api/order-admin-actions.js (action "override-item-pricing"), which
-- also recomputes orders.subtotal to match.

CREATE POLICY "Admins update order items" ON public.order_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
