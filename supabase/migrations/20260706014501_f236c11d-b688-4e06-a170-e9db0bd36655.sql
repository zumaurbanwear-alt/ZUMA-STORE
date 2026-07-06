ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.products ADD CONSTRAINT products_badge_check CHECK (badge IS NULL OR badge IN ('new','sold_out','few_left'));