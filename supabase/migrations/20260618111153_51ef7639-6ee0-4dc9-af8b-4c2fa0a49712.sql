-- Schedule daily trial expiry tick via pg_cron + pg_net.
-- The endpoint requires the Supabase publishable key in the apikey header.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with the same name (idempotent).
DO $$
BEGIN
  PERFORM cron.unschedule('wigsmi-trials-tick');
EXCEPTION WHEN OTHERS THEN
  -- ignore if not scheduled
  NULL;
END$$;

SELECT cron.schedule(
  'wigsmi-trials-tick',
  '0 3 * * *', -- daily at 03:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://project--1afe14c8-cf3c-462b-9216-e596233413f8.lovable.app/api/public/hooks/trials-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y2dkbmhid29wZWN4aWF5ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzIzODMsImV4cCI6MjA5NDAwODM4M30.EkDT9uoKdHroiByuMKI1kzAJugjyZcyrzJOJJwMfvIY'
    ),
    body := '{}'::jsonb
  );
  $$
);
