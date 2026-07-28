-- validate_order_item_price() (20260703125936) blocks ANY unit_price that
-- doesn't exactly match products.price, on both INSERT and UPDATE, with no
-- exception. That's correct and necessary for the public checkout — but it
-- also silently blocks the admin "PROMOTION" price override introduced
-- later (order-admin-actions.js, action "override-item-pricing"), which
-- only failed at the DB layer with "unit_price does not match product
-- price" despite RLS + the endpoint's own admin check both passing.
--
-- Fix: let admins (has_role admin) bypass this specific validation. Non-admin
-- inserts/updates (the public checkout, or anyone hitting the REST API
-- directly) are unaffected and still locked to the catalog price.

CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_price numeric;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT price INTO v_price FROM public.products WHERE id = NEW.product_id;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Invalid product';
  END IF;
  IF NEW.unit_price IS NULL OR NEW.unit_price <> v_price THEN
    RAISE EXCEPTION 'unit_price does not match product price';
  END IF;
  RETURN NEW;
END;
$$;
