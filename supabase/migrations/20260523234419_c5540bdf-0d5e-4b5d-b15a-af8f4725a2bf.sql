
DROP VIEW IF EXISTS public.retailers_public;

CREATE OR REPLACE FUNCTION public.get_retailers_public(retailer_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  slug text,
  display_name text,
  logo_url text,
  website text,
  brand_primary text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.display_name, r.logo_url, r.website, r.brand_primary
  FROM public.retailers r
  WHERE r.is_active = true
    AND (retailer_ids IS NULL OR r.id = ANY(retailer_ids));
$$;

GRANT EXECUTE ON FUNCTION public.get_retailers_public(uuid[]) TO anon, authenticated;
