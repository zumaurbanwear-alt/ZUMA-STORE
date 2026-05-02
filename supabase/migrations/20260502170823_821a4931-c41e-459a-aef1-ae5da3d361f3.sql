
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Lock down SECURITY DEFINER functions: only authenticated callers (and our triggers) may execute
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Replace permissive INSERT policies with role-scoped ones (still effectively public, but explicit)
DROP POLICY IF EXISTS "Anyone creates orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone creates order items" ON public.order_items;

CREATE POLICY "Web visitors create orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(customer_name) BETWEEN 2 AND 120
    AND char_length(customer_email) BETWEEN 5 AND 255
    AND char_length(customer_phone) BETWEEN 6 AND 30
    AND char_length(customer_address) BETWEEN 5 AND 500
    AND total >= 0
  );

CREATE POLICY "Web visitors create order items" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (quantity > 0 AND unit_price >= 0);
