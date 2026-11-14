-- Applied to the live database on 14 November 2026, after the server code
-- that uses consume_try_on_as / refund_try_on_as was published.

-- 1. The old try-on functions are no longer callable with a browser key.
REVOKE EXECUTE ON FUNCTION public.consume_try_on(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_try_on_credit_balance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_try_on(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_try_on_credit_balance() TO service_role;

-- 2. New tables, sequences and functions start closed to browser keys. Until
--    now every new object was readable, writable and callable by anyone unless
--    a rule said otherwise. A migration that adds one must now GRANT what the
--    app needs, explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 3. The key the scheduled jobs send to the hook endpoints lives encrypted in
--    the vault instead of as plain text in a table. Safe to run again: it only
--    acts while the plain-text row still exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.scheduled_hook_credentials WHERE name = 'cron') THEN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'wigsmi_cron_hook_key') THEN
      PERFORM vault.create_secret(
        (SELECT secret FROM public.scheduled_hook_credentials WHERE name = 'cron'),
        'wigsmi_cron_hook_key',
        'Key the scheduled jobs send to the Wigsmi hook endpoints (matches CRON_SECRET).');
    END IF;
    PERFORM cron.alter_job(j.jobid, command := replace(j.command,
        '(SELECT secret FROM public.scheduled_hook_credentials WHERE name = ''cron'')',
        '(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''wigsmi_cron_hook_key'')'))
    FROM cron.job j WHERE j.active AND j.command LIKE '%scheduled_hook_credentials%';
    DELETE FROM public.scheduled_hook_credentials WHERE name = 'cron';
  END IF;
END $$;
