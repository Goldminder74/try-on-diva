ALTER TABLE public.wigs
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

DROP POLICY IF EXISTS "Wigs: public read published" ON public.wigs;

CREATE POLICY "Wigs: public read published"
ON public.wigs
FOR SELECT
TO public
USING (
  (is_published = true AND deleted_at IS NULL)
  OR EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE INDEX IF NOT EXISTS idx_wigs_public_catalog
ON public.wigs (is_published, deleted_at, created_at DESC);