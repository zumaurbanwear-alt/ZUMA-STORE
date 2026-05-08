-- Stage to temp values, then reassign
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY display_id DESC) AS new_rank
  FROM public.products
)
UPDATE public.products p
SET display_id = 'tmp_' || r.new_rank::text
FROM ranked r
WHERE p.id = r.id;

UPDATE public.products
SET display_id = LPAD(SUBSTRING(display_id FROM 5)::int::text, 5, '0')
WHERE display_id LIKE 'tmp_%';