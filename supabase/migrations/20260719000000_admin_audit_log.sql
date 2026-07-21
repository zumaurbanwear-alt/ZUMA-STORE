-- Admin audit log
--
-- Until now there was no record of who changed a product, edited an order,
-- or deleted anything from the admin panel. This adds a tamper-resistant
-- log: every INSERT/UPDATE/DELETE on products, orders, and order_items is
-- captured automatically via trigger, storing who did it (auth.uid()) and
-- a before/after snapshot. Regular admins can only READ the log — nothing
-- can INSERT/UPDATE/DELETE rows in it directly except the trigger itself
-- (SECURITY DEFINER), so an admin account can't quietly erase its own
-- trail.

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  table_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the log. No INSERT/UPDATE/DELETE policy exists for
-- anyone (including admins) — rows can only be created by the trigger
-- function below, which runs as SECURITY DEFINER and bypasses RLS.
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  actor_mail text;
BEGIN
  IF actor IS NOT NULL THEN
    SELECT email INTO actor_mail FROM auth.users WHERE id = actor;
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, actor_email, table_name, action, record_id, old_data, new_data)
  VALUES (
    actor,
    actor_mail,
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER products_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();

CREATE TRIGGER orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();

CREATE TRIGGER order_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();

-- Guest checkout inserts on orders/order_items will also be logged (actor
-- will be NULL since there's no authenticated user) — that's expected and
-- useful: it gives you a full timeline per order, not just admin edits.
