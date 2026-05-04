ALTER TABLE public.products ADD COLUMN IF NOT EXISTS collection text;
UPDATE public.products SET collection = 'IPSEITY' WHERE collection IS NULL;