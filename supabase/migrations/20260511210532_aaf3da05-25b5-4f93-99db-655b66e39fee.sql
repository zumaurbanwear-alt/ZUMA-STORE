CREATE OR REPLACE FUNCTION public.validate_order_item_variant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.size IS NULL OR btrim(NEW.size) = '' THEN
    RAISE EXCEPTION 'Order item size is required';
  END IF;

  IF NEW.color IS NULL OR btrim(NEW.color) = '' THEN
    RAISE EXCEPTION 'Order item color is required';
  END IF;

  NEW.size := upper(btrim(NEW.size));
  NEW.color := upper(btrim(NEW.color));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_variant ON public.order_items;
CREATE TRIGGER trg_validate_order_item_variant
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item_variant();