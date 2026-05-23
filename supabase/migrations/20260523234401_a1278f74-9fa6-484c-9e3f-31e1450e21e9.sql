
-- 1. Tighten analytics_events INSERT: require authentication
DROP POLICY IF EXISTS "Analytics: insert when known" ON public.analytics_events;
CREATE POLICY "Analytics: insert authenticated"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Allow consumers to delete their own profile
CREATE POLICY "Consumer: delete own"
ON public.consumer_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Restrict retailers SELECT to owner/admin; expose safe public columns via a view
DROP POLICY IF EXISTS "Retailers: public read basic" ON public.retailers;

CREATE POLICY "Retailers: owner or admin read"
ON public.retailers
FOR SELECT
USING (
  auth.uid() = owner_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE OR REPLACE VIEW public.retailers_public
WITH (security_invoker = true)
AS
SELECT id, slug, display_name, logo_url, website, brand_primary
FROM public.retailers
WHERE is_active = true;

-- Re-allow public read of just the safe columns through the view.
-- security_invoker=true means RLS still applies, so add a permissive
-- SELECT policy scoped to public-safe columns by relying on a separate
-- policy gated by current_setting. Simpler: switch view to definer mode.
ALTER VIEW public.retailers_public SET (security_invoker = false);

GRANT SELECT ON public.retailers_public TO anon, authenticated;

-- 4. Align widget_embeds WITH CHECK with USING so admins can insert
DROP POLICY IF EXISTS "Widgets: retailer own" ON public.widget_embeds;
CREATE POLICY "Widgets: retailer own"
ON public.widget_embeds
FOR ALL
USING (
  (EXISTS (SELECT 1 FROM retailers r WHERE r.id = widget_embeds.retailer_id AND r.owner_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM retailers r WHERE r.id = widget_embeds.retailer_id AND r.owner_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Enforce path-based ownership on wig-images storage policies
DROP POLICY IF EXISTS "Wig images retailer write" ON storage.objects;
DROP POLICY IF EXISTS "Wig images retailer update" ON storage.objects;
DROP POLICY IF EXISTS "Wig images retailer delete" ON storage.objects;

CREATE POLICY "Wig images retailer write"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'wig-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.retailers WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Wig images retailer update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'wig-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.retailers WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Wig images retailer delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'wig-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.retailers WHERE owner_id = auth.uid()
    )
  )
);
