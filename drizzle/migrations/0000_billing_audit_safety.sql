ALTER TABLE public.retailers ADD COLUMN IF NOT EXISTS vat_number text;
COMMENT ON COLUMN public.retailers.vat_number IS 'Optional self-reported VAT number; not tax verification or exemption.';
COMMENT ON COLUMN public.subscriptions.paddle_subscription_id IS 'DEPRECATED: replaced by stripe_subscription_id; retained for live compatibility.';
COMMENT ON COLUMN public.subscriptions.paddle_customer_id IS 'DEPRECATED: replaced by stripe_customer_id; retained for live compatibility.';
CREATE TABLE public.scheduled_hook_credentials (name text PRIMARY KEY, secret text NOT NULL);
GRANT ALL ON public.scheduled_hook_credentials TO service_role;
REVOKE ALL ON public.scheduled_hook_credentials FROM anon, authenticated;
ALTER TABLE public.scheduled_hook_credentials ENABLE ROW LEVEL SECURITY;