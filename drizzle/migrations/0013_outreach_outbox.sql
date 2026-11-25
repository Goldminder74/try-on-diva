-- Retailer outreach sent from info@wigsmi.com through the Gmail API.
-- The Mail desk agent queues each email here (through the owner's Lovable
-- database access); the site sends it with links exactly as written, instead
-- of the google.com redirects the Gmail connector produces.
-- Both tables are closed to anon and authenticated (default privileges, 0011):
-- only the service role and the database owner can read or write them.

CREATE TABLE IF NOT EXISTS public.outreach_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('first', 'follow_up', 'reply')),
  to_email text NOT NULL CHECK (length(to_email) <= 254),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body_html text NOT NULL CHECK (length(body_html) <= 20000),
  body_text text NOT NULL CHECK (length(body_text) <= 10000),
  thread_id text,
  retailer text,
  country text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'rejected')),
  attempts integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  gmail_thread_id text,
  error text
);
CREATE INDEX IF NOT EXISTS outreach_outbox_status_created_idx
  ON public.outreach_outbox (status, created_at);
CREATE INDEX IF NOT EXISTS outreach_outbox_sent_at_idx
  ON public.outreach_outbox (sent_at) WHERE status = 'sent';
ALTER TABLE public.outreach_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_outbox FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.outreach_outbox TO service_role;

-- One row: the Gmail connection for the sender. Holds a Google refresh token,
-- so it is never readable by browser roles.
CREATE TABLE IF NOT EXISTS public.outreach_gmail_auth (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email text,
  refresh_token text,
  oauth_state text,
  oauth_state_expires timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_gmail_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_gmail_auth FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.outreach_gmail_auth TO service_role;

-- Wake the sender as soon as rows are queued (no polling job). Uses the same
-- vault key as the scheduled hooks.
CREATE OR REPLACE FUNCTION public.notify_outreach_outbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--1afe14c8-cf3c-462b-9216-e596233413f8.lovable.app/api/public/hooks/outreach-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y2dkbmhid29wZWN4aWF5ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzIzODMsImV4cCI6MjA5NDAwODM4M30.EkDT9uoKdHroiByuMKI1kzAJugjyZcyrzJOJJwMfvIY',
      'x-cron-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'wigsmi_cron_hook_key')
    ),
    body := '{}'::jsonb
  );
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_outreach_outbox() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS outreach_outbox_notify ON public.outreach_outbox;
CREATE TRIGGER outreach_outbox_notify
  AFTER INSERT ON public.outreach_outbox
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_outreach_outbox();
