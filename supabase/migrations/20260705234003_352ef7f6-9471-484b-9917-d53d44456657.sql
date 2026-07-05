CREATE TABLE public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.newsletters TO anon;
GRANT SELECT, INSERT ON public.newsletters TO authenticated;
GRANT ALL ON public.newsletters TO service_role;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletters FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read newsletters" ON public.newsletters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));