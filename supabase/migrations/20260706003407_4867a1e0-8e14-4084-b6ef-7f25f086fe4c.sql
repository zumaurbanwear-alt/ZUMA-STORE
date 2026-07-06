ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS archive_ref text;