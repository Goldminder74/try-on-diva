-- 1. Drop dead Stripe columns from subscriptions
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

-- 2. Add widget usage tracking on retailers
ALTER TABLE public.retailers
  ADD COLUMN IF NOT EXISTS widget_calls_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS widget_calls_month_reset date NOT NULL DEFAULT (date_trunc('month', now()))::date;

-- 3. Schedule cron jobs (idempotent — unschedule first if exists)
DO $$
BEGIN
  PERFORM cron.unschedule('wigsmi-trials-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('wigsmi-quota-reset');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'wigsmi-trials-tick',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1afe14c8-cf3c-462b-9216-e596233413f8.lovable.app/api/public/hooks/trials-tick',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y2dkbmhid29wZWN4aWF5ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzIzODMsImV4cCI6MjA5NDAwODM4M30.EkDT9uoKdHroiByuMKI1kzAJugjyZcyrzJOJJwMfvIY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'wigsmi-quota-reset',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1afe14c8-cf3c-462b-9216-e596233413f8.lovable.app/api/public/hooks/quota-reset',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y2dkbmhid29wZWN4aWF5ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzIzODMsImV4cCI6MjA5NDAwODM4M30.EkDT9uoKdHroiByuMKI1kzAJugjyZcyrzJOJJwMfvIY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);