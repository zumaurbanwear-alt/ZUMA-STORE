
CREATE OR REPLACE FUNCTION public.get_order_display_id(_order_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_id FROM public.orders WHERE id = _order_id
$$;

GRANT EXECUTE ON FUNCTION public.get_order_display_id(uuid) TO anon, authenticated;
