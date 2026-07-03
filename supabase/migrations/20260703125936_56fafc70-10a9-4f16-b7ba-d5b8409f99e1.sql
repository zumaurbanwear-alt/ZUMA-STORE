
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_price numeric;
BEGIN
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

DROP TRIGGER IF EXISTS trg_validate_order_item_price ON public.order_items;
CREATE TRIGGER trg_validate_order_item_price
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_order_item_price();
