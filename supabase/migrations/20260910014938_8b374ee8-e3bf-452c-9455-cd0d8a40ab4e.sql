DROP INDEX IF EXISTS public.anonymous_tryons_device_id_uidx;
DROP INDEX IF EXISTS public.anonymous_tryons_fingerprint_uidx;
CREATE INDEX IF NOT EXISTS anonymous_tryons_device_id_idx ON public.anonymous_tryons USING btree (device_id);
CREATE INDEX IF NOT EXISTS anonymous_tryons_fingerprint_idx ON public.anonymous_tryons USING btree (fingerprint_hash);