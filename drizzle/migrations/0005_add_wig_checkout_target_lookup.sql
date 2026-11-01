-- Safe read used by the tracked "buy from this shop" redirect: it returns the
-- listing's own product page plus the retailer's website host and whether they
-- run commission. SECURITY DEFINER because retailers rows are owner/admin only.
create or replace function public.get_wig_checkout_target(_wig_id uuid)
 returns table (
   wig_id uuid,
   retailer_id uuid,
   product_url text,
   retailer_website text,
   commission_enabled boolean,
   is_published boolean,
   deleted_at timestamptz
 )
 language sql
 stable
 security definer
 set search_path = 'public'
as $$
  select w.id, w.retailer_id, w.product_url, r.website, r.commission_enabled,
         w.is_published, w.deleted_at
  from public.wigs w
  join public.retailers r on r.id = w.retailer_id
  where w.id = _wig_id
$$;

revoke all on function public.get_wig_checkout_target(uuid) from public;
grant execute on function public.get_wig_checkout_target(uuid) to anon, authenticated, service_role;