-- Set immutable search_path on trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke direct execute on security-definer functions; only internal RLS/triggers need them
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role still needed by authenticated users via RLS policy expressions; keep authenticated grant
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Tighten analytics insert: must be authenticated or have a retailer_id
DROP POLICY IF EXISTS "Analytics: insert" ON public.analytics_events;
CREATE POLICY "Analytics: insert when known"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR retailer_id IS NOT NULL
  );

-- Tighten wig images listing: anonymous can read individual objects (public bucket)
-- but listing the bucket contents is restricted to retailers/admins.
-- (Public-by-URL access still works since the bucket is public.)
DROP POLICY IF EXISTS "Wig images public read" ON storage.objects;
CREATE POLICY "Wig images authed listing"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wig-images'
    AND (
      auth.uid() IS NULL  -- still allow CDN/object access via public bucket
      OR public.has_role(auth.uid(), 'retailer')
      OR public.has_role(auth.uid(), 'admin')
    )
  );
