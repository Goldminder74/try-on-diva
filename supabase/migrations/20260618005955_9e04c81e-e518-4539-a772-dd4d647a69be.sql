
CREATE TABLE public.anonymous_tryons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  fingerprint_hash text NOT NULL,
  ip_hash text,
  wig_id uuid,
  result_path text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX anonymous_tryons_device_id_uidx ON public.anonymous_tryons(device_id);
CREATE UNIQUE INDEX anonymous_tryons_fingerprint_uidx ON public.anonymous_tryons(fingerprint_hash);
CREATE INDEX anonymous_tryons_ip_hash_idx ON public.anonymous_tryons(ip_hash);

GRANT ALL ON public.anonymous_tryons TO service_role;

ALTER TABLE public.anonymous_tryons ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies for anon/authenticated: access only via service-role server functions.
