-- The checkout endpoint (public INSERT on orders/order_items, see
-- 20260502170802) has no throttling at all: anyone — not just the site's
-- own form — can script unlimited fake orders straight against the
-- Supabase REST API. Now that pricing is locked server-side (see
-- 20260713020000/20260713030000) this isn't a financial risk, but it's
-- still an easy way to flood the admin dashboard with junk orders and
-- waste staff time chasing fake phone numbers.
--
-- This adds a simple server-side throttle: if the same phone or email has
-- placed 3+ orders in the last 10 minutes, the new insert is rejected.
-- SECURITY DEFINER because counting existing orders requires reading the
-- orders table, which anonymous/public requests can't do directly (only
-- admins can SELECT orders — see the RLS policy in 20260502170802).

CREATE OR REPLACE FUNCTION public.enforce_order_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.orders
  WHERE created_at > now() - interval '10 minutes'
    AND (customer_phone = NEW.customer_phone OR customer_email = NEW.customer_email);

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many orders submitted recently — please wait a few minutes and try again.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_rate_limit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rate_limit();
