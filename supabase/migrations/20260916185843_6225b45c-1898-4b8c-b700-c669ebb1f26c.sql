ALTER TABLE public.anonymous_tryons
  ADD COLUMN IF NOT EXISTS month_start date NOT NULL DEFAULT ((date_trunc('month', (now() AT TIME ZONE 'utc')))::date),
  ADD COLUMN IF NOT EXISTS seq integer NOT NULL DEFAULT 1;

UPDATE public.anonymous_tryons
  SET month_start = (date_trunc('month', (created_at AT TIME ZONE 'utc')))::date
  WHERE month_start IS DISTINCT FROM (date_trunc('month', (created_at AT TIME ZONE 'utc')))::date;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY device_id, month_start ORDER BY created_at, id) AS rn
  FROM public.anonymous_tryons
)
UPDATE public.anonymous_tryons a SET seq = ranked.rn FROM ranked WHERE ranked.id = a.id;

CREATE UNIQUE INDEX IF NOT EXISTS anonymous_tryons_device_month_seq_idx
  ON public.anonymous_tryons (device_id, month_start, seq);

CREATE INDEX IF NOT EXISTS anonymous_tryons_fp_month_idx
  ON public.anonymous_tryons (fingerprint_hash, month_start);

CREATE INDEX IF NOT EXISTS anonymous_tryons_ip_month_idx
  ON public.anonymous_tryons (ip_hash, month_start);