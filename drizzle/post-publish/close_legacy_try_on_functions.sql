-- Run ONCE, by hand, AFTER the server code that uses consume_try_on_as,
-- refund_try_on_as and try_on_credit_balance_as is published.
--
-- It is deliberately not part of the numbered migrations: the code that was
-- live before this change still calls consume_try_on with the shopper's own
-- session, so closing it early would stop signed-in try-ons working.
REVOKE EXECUTE ON FUNCTION public.consume_try_on(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_try_on_credit_balance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_try_on(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_try_on_credit_balance() TO service_role;
