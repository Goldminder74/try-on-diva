DROP POLICY IF EXISTS "Wigs: public read published" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer manage" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer read own" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer insert own" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer update own" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer delete own" ON public.wigs;

CREATE POLICY "Wigs: public read published"
ON public.wigs
FOR SELECT
TO public
USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Wigs: retailer read own"
ON public.wigs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Wigs: retailer insert own"
ON public.wigs
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Wigs: retailer update own"
ON public.wigs
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Wigs: retailer delete own"
ON public.wigs
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
);