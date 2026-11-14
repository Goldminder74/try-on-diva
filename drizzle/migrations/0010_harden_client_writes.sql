-- Rules that were enforced only by the app's own server functions are now
-- enforced by the database, so calling the data API directly with a signed-in
-- (or anonymous) key cannot bypass them. Everything here is compatible with
-- the server code that was live on 14 November 2026: protected columns are
-- silently preserved rather than rejected wherever that code still sends them.

-- ---------------------------------------------------------------------------
-- 0. Who is a trusted writer
-- ---------------------------------------------------------------------------
-- Trusted: the service role and SECURITY DEFINER functions (current_user is
-- then the function owner), plus signed-in admins. Everyone else writes through
-- the anon / authenticated roles and gets the guards below.
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
 RETURNS boolean LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN RETURN true; END IF;
  IF current_user = 'anon' OR auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN public.has_role(auth.uid(), 'admin'::public.app_role);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.is_trusted_writer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trusted_writer() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Shopper profile: the monthly try-on count is not user-editable
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_consumer_profiles()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.try_on_count_this_month := 0;
    NEW.try_on_month_reset := date_trunc('month', now())::date;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.try_on_count_this_month := OLD.try_on_count_this_month;
    NEW.try_on_month_reset := OLD.try_on_month_reset;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS guard_consumer_profiles ON public.consumer_profiles;
CREATE TRIGGER guard_consumer_profiles BEFORE INSERT OR UPDATE ON public.consumer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_consumer_profiles();

-- Deleting the row and letting it be recreated reset the count to zero.
-- Account deletion runs with the service role and does not need this policy.
DROP POLICY IF EXISTS "Consumer: delete own" ON public.consumer_profiles;

-- ---------------------------------------------------------------------------
-- 2. Account profile: the email address follows the sign-in, not the user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profiles()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS guard_profiles ON public.profiles;
CREATE TRIGGER guard_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles();

-- ---------------------------------------------------------------------------
-- 3. Retailers: plan, trial, activity and counters belong to billing
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_retailers()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.retailers r WHERE r.owner_id = NEW.owner_id) THEN
      RAISE EXCEPTION 'This account already has a retailer profile.';
    END IF;
    NEW.plan := 'starter';
    NEW.trial_ends_at := now() + interval '30 days';
    NEW.is_active := true;
    NEW.widget_calls_this_month := 0;
    NEW.widget_calls_month_reset := date_trunc('month', now())::date;
    NEW.commission_enabled := false;
    NEW.commission_rate_bps := 0;
    NEW.commission_terms_accepted_at := NULL;
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.owner_id := OLD.owner_id;
  NEW.created_at := OLD.created_at;
  NEW.plan := OLD.plan;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.is_active := OLD.is_active;
  NEW.widget_calls_this_month := OLD.widget_calls_this_month;
  NEW.widget_calls_month_reset := OLD.widget_calls_month_reset;

  -- The commission agreement can be accepted once; it cannot be backdated or
  -- withdrawn from here.
  IF OLD.commission_terms_accepted_at IS NOT NULL THEN
    NEW.commission_terms_accepted_at := OLD.commission_terms_accepted_at;
  ELSIF NEW.commission_terms_accepted_at IS NOT NULL THEN
    NEW.commission_terms_accepted_at := now();
  END IF;

  IF NEW.commission_enabled THEN
    IF NEW.commission_rate_bps IS NULL OR NEW.commission_rate_bps NOT BETWEEN 800 AND 1500 THEN
      RAISE EXCEPTION 'Choose a commission rate between 8%% and 15%%.';
    END IF;
    IF NEW.commission_terms_accepted_at IS NULL THEN
      RAISE EXCEPTION 'Accept the commission agreement to turn commission on.';
    END IF;
  ELSE
    NEW.commission_rate_bps := 0;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS guard_retailers ON public.retailers;
CREATE TRIGGER guard_retailers BEFORE INSERT OR UPDATE ON public.retailers
  FOR EACH ROW EXECUTE FUNCTION public.guard_retailers();

-- ---------------------------------------------------------------------------
-- 4. Wigs: counters and curation are not retailer-editable, and the plan's
--    published-wig cap and trial expiry hold for direct writes too
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_wigs()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _trusted boolean;
  _owner uuid;
  _trial_ends timestamptz;
  _sub record;
  _plan text;
  _cap integer;
  _published integer;
BEGIN
  -- SECURITY DEFINER so the cap can be counted across the retailer's wigs and
  -- subscriptions. current_user is therefore the function owner, so the
  -- caller is identified by the role in their request token: only browser
  -- keys (anon, authenticated) are guarded, and admins are exempt.
  _trusted := coalesce(auth.role(), '') NOT IN ('anon', 'authenticated')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));
  IF _trusted THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.click_count := 0;
    NEW.try_on_count := 0;
    NEW.featured_rank := NULL;
    NEW.auto_unpublished_at := NULL;
    NEW.deleted_at := NULL;
  ELSE
    NEW.id := OLD.id;
    NEW.retailer_id := OLD.retailer_id;
    NEW.created_at := OLD.created_at;
    NEW.click_count := OLD.click_count;
    NEW.try_on_count := OLD.try_on_count;
    NEW.featured_rank := OLD.featured_rank;
    NEW.auto_unpublished_at := OLD.auto_unpublished_at;
    NEW.deleted_at := OLD.deleted_at;
  END IF;

  -- Only a wig that is being newly published needs the plan check.
  IF NEW.is_published IS NOT TRUE
     OR (TG_OP = 'UPDATE' AND OLD.is_published IS TRUE) THEN
    RETURN NEW;
  END IF;

  SELECT r.owner_id, r.trial_ends_at INTO _owner, _trial_ends
  FROM public.retailers r WHERE r.id = NEW.retailer_id;

  SELECT s.plan, s.status, s.current_period_end INTO _sub
  FROM public.subscriptions s
  WHERE s.user_id = _owner AND s.customer_type = 'retailer'
    AND s.stripe_subscription_id IS NOT NULL
  ORDER BY s.created_at DESC LIMIT 1;

  _plan := NULL;
  IF FOUND AND _sub.plan IN ('starter', 'growth', 'scale', 'enterprise') AND (
       (_sub.status IN ('active', 'trialing')
          AND (_sub.current_period_end IS NULL OR _sub.current_period_end > now()))
    OR (_sub.status IN ('past_due', 'unpaid', 'canceled')
          AND _sub.current_period_end IS NOT NULL AND _sub.current_period_end > now())
  ) THEN
    _plan := _sub.plan;
  ELSIF _trial_ends IS NOT NULL AND _trial_ends > now() THEN
    _plan := 'starter';
  END IF;

  IF _plan IS NULL THEN
    RAISE EXCEPTION 'Your trial has ended. Upgrade to a paid plan to publish wigs.';
  END IF;

  _cap := CASE _plan WHEN 'starter' THEN 30 WHEN 'growth' THEN 150 ELSE NULL END;
  IF _cap IS NOT NULL THEN
    SELECT count(*) INTO _published FROM public.wigs w
    WHERE w.retailer_id = NEW.retailer_id AND w.is_published = true AND w.id <> NEW.id;
    IF _published >= _cap THEN
      RAISE EXCEPTION 'You have reached the % plan limit of % published wigs. Upgrade to add more.', _plan, _cap;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_wigs() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_wigs ON public.wigs;
CREATE TRIGGER guard_wigs BEFORE INSERT OR UPDATE ON public.wigs
  FOR EACH ROW EXECUTE FUNCTION public.guard_wigs();

-- A buy click or try-on count is not an edit: leave updated_at alone, so the
-- sitemap's last-modified dates do not churn with traffic.
CREATE OR REPLACE FUNCTION public.touch_wigs_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF (to_jsonb(NEW) - 'click_count' - 'try_on_count' - 'updated_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'click_count' - 'try_on_count' - 'updated_at') THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS touch_wigs ON public.wigs;
CREATE TRIGGER touch_wigs BEFORE UPDATE ON public.wigs
  FOR EACH ROW EXECUTE FUNCTION public.touch_wigs_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Analytics cannot be forged
-- ---------------------------------------------------------------------------
-- Anonymous try-ons are recorded by the server with the service role. A
-- signed-in shopper may record only their own event, and the retailer is taken
-- from the wig rather than from the request.
DROP POLICY IF EXISTS "Try-on: insert any signed in" ON public.try_on_events;
DROP POLICY IF EXISTS "Try-on: insert own" ON public.try_on_events;
CREATE POLICY "Try-on: insert own" ON public.try_on_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_try_on_events()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  NEW.retailer_id := (SELECT w.retailer_id FROM public.wigs w WHERE w.id = NEW.wig_id);
  NEW.source := 'app';
  NEW.created_at := now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_try_on_events() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_try_on_events ON public.try_on_events;
CREATE TRIGGER guard_try_on_events BEFORE INSERT ON public.try_on_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_try_on_events();

-- Nothing in the app inserts wig_clicks from a browser.
DROP POLICY IF EXISTS "Clicks: insert any" ON public.wig_clicks;

-- Click counting is done by the server with the service role.
CREATE OR REPLACE FUNCTION public.increment_wig_click(_wig_id uuid)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  update public.wigs set click_count = click_count + 1
  where id = _wig_id and is_published = true and deleted_at is null
$function$;
REVOKE EXECUTE ON FUNCTION public.increment_wig_click(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wig_click(uuid) TO service_role;

-- Archived stock must not reappear through a known id.
CREATE OR REPLACE FUNCTION public.get_wig_checkout_target(_wig_id uuid)
 RETURNS TABLE(wig_id uuid, retailer_id uuid, product_url text, retailer_website text, commission_enabled boolean, is_published boolean, deleted_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select w.id, w.retailer_id, w.product_url, r.website, r.commission_enabled,
         w.is_published, w.deleted_at
  from public.wigs w
  join public.retailers r on r.id = w.retailer_id
  where w.id = _wig_id and w.is_published = true and w.deleted_at is null
$function$;

-- ---------------------------------------------------------------------------
-- 6. Commission ledger: the amount owed is computed, and settled rows are final
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_affiliate_sales()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  _rate integer;
  _enabled boolean;
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT r.commission_rate_bps, r.commission_enabled INTO _rate, _enabled
    FROM public.retailers r WHERE r.id = NEW.retailer_id;
    IF _enabled IS NOT TRUE OR _rate IS NULL OR _rate NOT BETWEEN 800 AND 1500 THEN
      RAISE EXCEPTION 'Turn commission on first.';
    END IF;
    NEW.commission_bps := _rate;
    NEW.status := 'pending';
  ELSE
    IF OLD.status = 'settled' THEN
      RAISE EXCEPTION 'A settled sale cannot be changed.';
    END IF;
    NEW.id := OLD.id;
    NEW.retailer_id := OLD.retailer_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.commission_bps := OLD.commission_bps;
  END IF;
  NEW.commission_gbp := round(round(NEW.sale_gbp * 100) * NEW.commission_bps / 10000.0) / 100.0;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS guard_affiliate_sales ON public.affiliate_sales;
CREATE TRIGGER guard_affiliate_sales BEFORE INSERT OR UPDATE ON public.affiliate_sales
  FOR EACH ROW EXECUTE FUNCTION public.guard_affiliate_sales();

-- ---------------------------------------------------------------------------
-- 7. Try-on spending: the server spends and refunds on the shopper's behalf
-- ---------------------------------------------------------------------------
-- Packs record which payment mode bought them, so a test-mode purchase never
-- counts on the live site.
ALTER TABLE public.try_on_credits
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'live'
  CHECK (environment IN ('sandbox', 'live'));

CREATE OR REPLACE FUNCTION public.consume_try_on_as(_user_id uuid, _limit integer, _environment text)
 RETURNS TABLE(allowed boolean, remaining integer, source text, credit_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _month_start date := date_trunc('month', now())::date;
  _new_count integer;
  _credit_id uuid;
begin
  if _user_id is null or _limit is null then
    return query select false, 0, null::text, null::uuid;
    return;
  end if;

  insert into public.consumer_profiles (user_id, try_on_count_this_month, try_on_month_reset)
  values (_user_id, 0, _month_start)
  on conflict (user_id) do nothing;

  -- 1. Spend the plan's monthly allowance.
  update public.consumer_profiles
  set try_on_count_this_month =
        case when try_on_month_reset is null or try_on_month_reset < _month_start
             then 1 else try_on_count_this_month + 1 end,
      try_on_month_reset = _month_start
  where user_id = _user_id
    and (
      try_on_month_reset is null
      or try_on_month_reset < _month_start
      or try_on_count_this_month < _limit
    )
  returning try_on_count_this_month into _new_count;

  if _new_count is not null then
    return query select true, greatest(0, _limit - _new_count), 'quota'::text, null::uuid;
    return;
  end if;

  -- 2. Allowance gone: draw one try-on from the oldest unexpired pack.
  select c.id into _credit_id
  from public.try_on_credits c
  where c.user_id = _user_id
    and c.environment = _environment
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
$function$;

CREATE OR REPLACE FUNCTION public.refund_try_on_as(_user_id uuid, _source text, _credit_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _month_start date := date_trunc('month', now())::date;
begin
  if _user_id is null then return; end if;

  if _source = 'credit' then
    if _credit_id is null then return; end if;
    update public.try_on_credits
    set credits_used = greatest(0, credits_used - 1),
        status = case when status = 'exhausted' then 'active' else status end,
        updated_at = now()
    where id = _credit_id and user_id = _user_id;
    return;
  end if;

  update public.consumer_profiles
  set try_on_count_this_month = greatest(0, try_on_count_this_month - 1)
  where user_id = _user_id and try_on_month_reset = _month_start;
end;
$function$;

CREATE OR REPLACE FUNCTION public.try_on_credit_balance_as(_user_id uuid, _environment text)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select coalesce(sum(c.credits_purchased - c.credits_used), 0)::integer
  from public.try_on_credits c
  where c.user_id = _user_id
    and c.environment = _environment
    and c.status = 'active'
    and c.expires_at > now()
$function$;

REVOKE EXECUTE ON FUNCTION public.consume_try_on_as(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_try_on_as(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.try_on_credit_balance_as(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_try_on_as(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_try_on_as(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_on_credit_balance_as(uuid, text) TO service_role;

-- The old refund could be called directly, over and over, to wind a monthly
-- count or a used pack back to zero. Nothing may call it from a browser key.
REVOKE EXECUTE ON FUNCTION public.refund_try_on(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_try_on(text, uuid) TO service_role;
-- The old spend function stays callable by signed-in users only until the
-- server code that uses consume_try_on_as is published (see 0011).
REVOKE EXECUTE ON FUNCTION public.consume_try_on(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_try_on(integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Table privileges the app never uses
-- ---------------------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Storage accepts images only, up to 10 MB
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id IN ('tryons', 'user-photos', 'wig-images');
