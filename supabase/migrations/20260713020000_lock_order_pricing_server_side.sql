-- Order pricing was fully client-supplied: CheckoutDialog computes
-- unit_price and subtotal in the browser and inserts them directly, and
-- RLS only checked unit_price >= 0 / quantity > 0 — not that either value
-- matched the real product. Anyone calling the Supabase REST API directly
-- (not just the UI) could place an order at any price they wanted.
--
-- This closes that hole at the DB level, where the client can't bypass it:
--   1. order_items.unit_price is overwritten from products.price the
--      moment a row is inserted, regardless of what was submitted.
--   2. orders.subtotal is recomputed from the real order_items right after
--      they're inserted, so the client's initial (possibly fabricated)
--      subtotal on the orders row gets corrected immediately. orders.total
--      already derives from subtotal + shipping_fee as a generated column
--      (see 20260712220000), so it follows automatically.
--
-- shipping_fee itself is left as-is: it comes from a per-city rate table
-- that only exists in the frontend (src/data/shippingRates.ts), not in
-- Postgres, and worth at most ~45 MAD — a much smaller exposure than the
-- product prices this migration closes off. Flagged as a follow-up if that
-- table ever gets mirrored into the DB.

CREATE OR REPLACE FUNCTION public.set_order_item_unit_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  real_price numeric(10,2);
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT price INTO real_price FROM public.products WHERE id = NEW.product_id;
    IF FOUND THEN
      NEW.unit_price := real_price;
    END IF;
    -- product_id set but not found (deleted between add-to-cart and checkout):
    -- fall through and keep the submitted unit_price rather than blocking
    -- the whole order over a stale reference.
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_set_unit_price
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_order_item_unit_price();

CREATE OR REPLACE FUNCTION public.recompute_order_subtotal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders
  SET subtotal = COALESCE(
    (SELECT SUM(quantity * unit_price) FROM public.order_items WHERE order_id = NEW.order_id),
    0
  )
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_recompute_subtotal
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recompute_order_subtotal();
