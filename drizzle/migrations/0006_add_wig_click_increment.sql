-- Atomic counter for tracked hand-offs to a shop's product page.
create or replace function public.increment_wig_click(_wig_id uuid)
 returns void
 language sql
 security definer
 set search_path = 'public'
as $$
  update public.wigs set click_count = click_count + 1 where id = _wig_id
$$;

revoke all on function public.increment_wig_click(uuid) from public;
grant execute on function public.increment_wig_click(uuid) to service_role;