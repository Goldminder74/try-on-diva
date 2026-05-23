-- Ensure the public catalog policy is present and limited to published, non-deleted wigs.
DROP POLICY IF EXISTS "Wigs: public read published" ON public.wigs;
CREATE POLICY "Wigs: public read published"
ON public.wigs
FOR SELECT
TO anon, authenticated
USING (is_published = true AND deleted_at IS NULL);

-- Restrict retailer-owned wig management policies to signed-in users so anonymous
-- catalog reads do not evaluate owner/admin checks that depend on has_role().
DROP POLICY IF EXISTS "Wigs: retailer read own" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer insert own" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer update own" ON public.wigs;
DROP POLICY IF EXISTS "Wigs: retailer delete own" ON public.wigs;

CREATE POLICY "Wigs: retailer read own"
ON public.wigs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Wigs: retailer insert own"
ON public.wigs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Wigs: retailer update own"
ON public.wigs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Wigs: retailer delete own"
ON public.wigs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.retailers r
    WHERE r.id = wigs.retailer_id
      AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Owner/admin retailer policies should be account-only; public retailer display
-- data is exposed through get_retailers_public() instead.
DROP POLICY IF EXISTS "Retailers: owner or admin read" ON public.retailers;
DROP POLICY IF EXISTS "Retailers: owner insert" ON public.retailers;
DROP POLICY IF EXISTS "Retailers: owner update" ON public.retailers;
DROP POLICY IF EXISTS "Retailers: admin delete" ON public.retailers;

CREATE POLICY "Retailers: owner or admin read"
ON public.retailers
FOR SELECT
TO authenticated
USING ((auth.uid() = owner_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Retailers: owner insert"
ON public.retailers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Retailers: owner update"
ON public.retailers
FOR UPDATE
TO authenticated
USING ((auth.uid() = owner_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((auth.uid() = owner_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Retailers: admin delete"
ON public.retailers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- has_role() is needed by authenticated RLS policies; do not grant it to anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Safe public RPC used by the catalog to show retailer names only.
GRANT EXECUTE ON FUNCTION public.get_retailers_public(uuid[]) TO anon, authenticated, service_role;