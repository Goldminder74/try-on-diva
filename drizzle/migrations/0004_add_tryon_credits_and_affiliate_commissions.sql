-- ===========================================================================
-- 1. One-off try-on top-up credits (e.g. "10 try-ons for £2.99")
--    A credit row is a purchased bundle. The monthly plan allowance is always
--    spent first; once it is gone, consume_try_on() draws from the oldest
--    unexpired credit bundle.
-- ===========================================================================
create table if not exists public.try_on_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  credits_purchased integer not null check (credits_purchased > 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  source text not null default 'topup',
  price_id text,
  amount_gbp numeric(10,2),
  currency text not null default 'GBP',
  stripe_checkout_session_id text unique,
  status text not null default 'active' check (status in ('active','exhausted','refunded')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (credits_used <= credits_purchased)
);

create index if not exists try_on_credits_user_idx
  on public.try_on_credits (user_id, status, expires_at);

GRANT SELECT ON public.try_on_credits TO authenticated;
GRANT ALL ON public.try_on_credits TO service_role;

ALTER TABLE public.try_on_credits ENABLE ROW LEVEL SECURITY;

create policy "Try-on credits: own read"
  on public.try_on_credits for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

-- Written only by the app's own server (payment recovery, grants).
create policy "Try-on credits: service manage"
  on public.try_on_credits for all to authenticated
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ===========================================================================
-- 2. Retailer commission settings
--    Rate is stored in basis points (1000 = 10%). Cap 2500 = 25%.
-- ===========================================================================
alter table public.retailers
  add column if not exists commission_enabled boolean not null default false,
  add column if not exists commission_rate_bps integer not null default 0
    check (commission_rate_bps between 0 and 2500),
  add column if not exists commission_terms_accepted_at timestamptz;

-- ===========================================================================
-- 3. Tracked outbound clicks (shopper leaves Wigsmi for a retailer's shop)
-- ===========================================================================
create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  wig_id uuid references public.wigs(id) on delete set null,
  shopper_user_id uuid,
  token text not null unique,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists affiliate_clicks_retailer_idx
  on public.affiliate_clicks (retailer_id, created_at desc);
create index if not exists affiliate_clicks_wig_idx on public.affiliate_clicks (wig_id);

GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

create policy "Affiliate clicks: retailer read own"
  on public.affiliate_clicks for select to authenticated
  using (
    exists (
      select 1 from public.retailers r
      where r.id = affiliate_clicks.retailer_id and r.owner_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Affiliate clicks: admin manage"
  on public.affiliate_clicks for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ===========================================================================
-- 4. Logged affiliate sales + the commission they owe Wigsmi
--    Retailers log their own orders; only Wigsmi staff can mark a sale settled.
-- ===========================================================================
create table if not exists public.affiliate_sales (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  wig_id uuid references public.wigs(id) on delete set null,
  click_id uuid references public.affiliate_clicks(id) on delete set null,
  order_reference text not null,
  sale_gbp numeric(12,2) not null check (sale_gbp > 0),
  commission_bps integer not null check (commission_bps between 0 and 2500),
  commission_gbp numeric(12,2) not null check (commission_gbp >= 0),
  currency text not null default 'GBP',
  status text not null default 'pending' check (status in ('pending','confirmed','settled','void')),
  sale_date date not null default current_date,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (retailer_id, order_reference)
);

create index if not exists affiliate_sales_retailer_idx
  on public.affiliate_sales (retailer_id, sale_date desc);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sales TO authenticated;
GRANT ALL ON public.affiliate_sales TO service_role;

ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;

create policy "Affiliate sales: retailer read own"
  on public.affiliate_sales for select to authenticated
  using (
    exists (
      select 1 from public.retailers r
      where r.id = affiliate_sales.retailer_id and r.owner_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Affiliate sales: retailer log own"
  on public.affiliate_sales for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.retailers r
      where r.id = affiliate_sales.retailer_id and r.owner_id = auth.uid()
    )
  );

-- Retailers may correct their own entries but cannot settle them.
create policy "Affiliate sales: retailer edit own"
  on public.affiliate_sales for update to authenticated
  using (
    exists (
      select 1 from public.retailers r
      where r.id = affiliate_sales.retailer_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.retailers r
      where r.id = affiliate_sales.retailer_id and r.owner_id = auth.uid()
    )
    and status in ('pending','confirmed','void')
  );

create policy "Affiliate sales: admin manage"
  on public.affiliate_sales for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ===========================================================================
-- 5. Try-on consumption: monthly allowance first, then purchased credits
-- ===========================================================================
drop function if exists public.consume_try_on(integer);
drop function if exists public.refund_try_on();

create function public.consume_try_on(_limit integer)
 returns table(allowed boolean, remaining integer, source text, credit_id uuid)
 language plpgsql
 security definer
 set search_path = 'public'
as $$
declare
  _uid uuid := auth.uid();
  _month_start date := date_trunc('month', now())::date;
  _new_count integer;
  _credit_id uuid;
begin
  if _uid is null then
    return query select false, 0, null::text, null::uuid;
    return;
  end if;

  insert into public.consumer_profiles (user_id, try_on_count_this_month, try_on_month_reset)
  values (_uid, 0, _month_start)
  on conflict (user_id) do nothing;

  -- 1. Spend the plan's monthly allowance.
  update public.consumer_profiles
  set try_on_count_this_month =
        case when try_on_month_reset is null or try_on_month_reset < _month_start
             then 1 else try_on_count_this_month + 1 end,
      try_on_month_reset = _month_start
  where user_id = _uid
    and (
      _limit is null
      or try_on_month_reset is null
      or try_on_month_reset < _month_start
      or try_on_count_this_month < _limit
    )
  returning try_on_count_this_month into _new_count;

  if _new_count is not null then
    return query select true,
      case when _limit is null then null::integer else greatest(0, _limit - _new_count) end,
      'quota'::text, null::uuid;
    return;
  end if;

  -- 2. Allowance gone: draw one try-on from the oldest unexpired credit bundle.
  select c.id into _credit_id
  from public.try_on_credits c
  where c.user_id = _uid
    and c.status = 'active'
    and c.credits_used < c.credits_purchased
    and c.expires_at > now()
  order by c.expires_at nulls last, c.created_at
  limit 1
  for update;

  if _credit_id is null then
    return query select false, 0, null::text, null::uuid;
    return;
  end if;

  update public.try_on_credits
  set credits_used = credits_used + 1,
      status = case when credits_used + 1 >= credits_purchased then 'exhausted' else status end,
      updated_at = now()
  where id = _credit_id;

  return query select true, null::integer, 'credit'::text, _credit_id;
end;
$$;

create function public.refund_try_on(_source text default 'quota', _credit_id uuid default null)
 returns void
 language plpgsql
 security definer
 set search_path = 'public'
as $$
declare
  _uid uuid := auth.uid();
  _month_start date := date_trunc('month', now())::date;
begin
  if _uid is null then return; end if;

  if _source = 'credit' then
    if _credit_id is not null then
      update public.try_on_credits
      set credits_used = greatest(0, credits_used - 1),
          status = case when status = 'exhausted' then 'active' else status end,
          updated_at = now()
      where id = _credit_id and user_id = _uid;
    else
      -- No id handed back: give the unit back to the most recently drawn bundle.
      update public.try_on_credits
      set credits_used = greatest(0, credits_used - 1),
          status = case when status = 'exhausted' then 'active' else status end,
          updated_at = now()
      where id = (
        select c.id from public.try_on_credits c
        where c.user_id = _uid and c.credits_used > 0 and c.expires_at > now()
        order by c.expires_at nulls last, c.created_at desc
        limit 1
      );
    end if;
    return;
  end if;

  update public.consumer_profiles
  set try_on_count_this_month = greatest(0, try_on_count_this_month - 1)
  where user_id = _uid and try_on_month_reset = _month_start;
end;
$$;

-- Credit balance helper used by the account and try-on screens.
create or replace function public.get_try_on_credit_balance()
 returns integer
 language sql
 stable
 security definer
 set search_path = 'public'
as $$
  select coalesce(sum(c.credits_purchased - c.credits_used), 0)::integer
  from public.try_on_credits c
  where c.user_id = auth.uid()
    and c.status = 'active'
    and c.expires_at > now()
$$;

revoke all on function public.get_try_on_credit_balance() from public;
grant execute on function public.get_try_on_credit_balance() to authenticated;
grant execute on function public.get_try_on_credit_balance() to service_role;