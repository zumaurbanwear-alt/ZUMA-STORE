
-- ROLES SYSTEM
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  category text NOT NULL DEFAULT 'T-Shirts',
  image_url text NOT NULL,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public can read visible products
CREATE POLICY "Anyone reads visible products" ON public.products
  FOR SELECT USING (is_visible = true);
-- Admins read all (for admin panel)
CREATE POLICY "Admins read all products" ON public.products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_city text NOT NULL,
  customer_address text NOT NULL,
  total numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash_on_delivery',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0)
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Anyone can place an order (guest checkout)
CREATE POLICY "Anyone creates orders" ON public.orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone creates order items" ON public.order_items
  FOR INSERT WITH CHECK (true);
-- Only admins read orders
CREATE POLICY "Admins read orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SEED PRODUCTS (using local asset paths — admin can replace with hosted URLs)
INSERT INTO public.products (slug, name, description, price, category, image_url, stock, sort_order) VALUES
  ('muerted-zephyr', 'Muerted Zephyr', 'Heavyweight oversized tee. Crimson chest mark.', 250, 'T-Shirts', '/src/assets/product-1.jpg', 12, 6),
  ('the-gaze',       'The Gaze',       'Limited graphic tee — Drop 001.',                 250, 'T-Shirts', '/src/assets/product-4.jpg', 2,  5),
  ('voidwalker',     'Voidwalker Hoodie','Heavy fleece hoodie. Engineered for the void.',  480, 'Hoodies',  '/src/assets/product-2.jpg', 0,  4),
  ('z-mark-cap',     'Z-Mark Cap',     'Embroidered Z mark on washed black canvas.',     150, 'Accessories','/src/assets/product-3.jpg', 30, 3),
  ('ipseity-tee',    'Ipseity Tee',    'Soft-hand cotton. Minimal mark.',                 280, 'T-Shirts', '/src/assets/product-1.jpg', 8,  7),
  ('shadow-hw',      'Shadow Heavyweight','500gsm fleece. Brushed inside.',               520, 'Hoodies',  '/src/assets/product-2.jpg', 4,  2);
