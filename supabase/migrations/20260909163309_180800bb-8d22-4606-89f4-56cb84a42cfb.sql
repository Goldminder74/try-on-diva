CREATE OR REPLACE FUNCTION public.consume_try_on(_limit integer)
RETURNS TABLE(allowed boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _month_start date := date_trunc('month', now())::date;
  _new_count integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  INSERT INTO public.consumer_profiles (user_id, try_on_count_this_month, try_on_month_reset)
  VALUES (_uid, 0, _month_start)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.consumer_profiles
  SET try_on_count_this_month =
        CASE WHEN try_on_month_reset IS NULL OR try_on_month_reset < _month_start
             THEN 1 ELSE try_on_count_this_month + 1 END,
      try_on_month_reset = _month_start
  WHERE user_id = _uid
    AND (
      _limit IS NULL
      OR try_on_month_reset IS NULL
      OR try_on_month_reset < _month_start
      OR try_on_count_this_month < _limit
    )
  RETURNING try_on_count_this_month INTO _new_count;

  IF _new_count IS NULL THEN
    RETURN QUERY SELECT false, 0;
  ELSE
    RETURN QUERY SELECT true, CASE WHEN _limit IS NULL THEN NULL::integer ELSE GREATEST(0, _limit - _new_count) END;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_try_on()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _month_start date := date_trunc('month', now())::date;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.consumer_profiles
  SET try_on_count_this_month = GREATEST(0, try_on_count_this_month - 1)
  WHERE user_id = _uid AND try_on_month_reset = _month_start;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_try_on(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_try_on() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_try_on(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_try_on() TO authenticated, service_role;