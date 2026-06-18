
-- 1. Tryons bucket: replace blanket public SELECT with path-scoped policies
DROP POLICY IF EXISTS "Public read access for tryons" ON storage.objects;

CREATE POLICY "Anon can read tryons in anon folder"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'tryons'
  AND (storage.foldername(name))[1] = 'anon'
);

CREATE POLICY "Authenticated can read own tryons"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tryons'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Lock down internal queue RPCs to service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 3. Document anonymous_tryons intentional lockdown (RLS on, no policies = service role only)
COMMENT ON TABLE public.anonymous_tryons IS
  'Anonymous try-on tracking. RLS enabled with no policies by design: all reads and writes go through server functions using the service role. Do not add anon/authenticated policies.';
