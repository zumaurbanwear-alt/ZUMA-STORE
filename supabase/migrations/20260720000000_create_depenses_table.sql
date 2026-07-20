-- Personal expense tracking ("DÉPENSES") for the admin back office.
--
-- Fully separate from the store's operational data (orders/products) —
-- this is admin-only bookkeeping. RLS restricts every operation to users
-- holding the "admin" role, same pattern as the rest of the admin panel.

CREATE TABLE public.depenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  produits text,
  prix numeric(10, 2) NOT NULL,
  date date NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX depenses_date_idx ON public.depenses (date);

ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read depenses" ON public.depenses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert depenses" ON public.depenses
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update depenses" ON public.depenses
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete depenses" ON public.depenses
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Same audit trail as products/orders/order_items.
CREATE TRIGGER depenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.depenses
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();
