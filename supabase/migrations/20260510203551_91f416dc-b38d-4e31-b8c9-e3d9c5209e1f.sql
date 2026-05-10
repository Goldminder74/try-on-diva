
-- Align subscriptions with Paddle schema
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

-- Backfill user_id from profile_id
UPDATE public.subscriptions SET user_id = profile_id WHERE user_id IS NULL;

-- Add unique constraint on paddle_subscription_id (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paddle_subscription_id_key
  ON public.subscriptions(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Allow service role to manage; keep existing select-own policy
DROP POLICY IF EXISTS "Subs: service manage" ON public.subscriptions;
CREATE POLICY "Subs: service manage"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update select policy to use user_id
DROP POLICY IF EXISTS "Subs: own" ON public.subscriptions;
CREATE POLICY "Subs: own"
  ON public.subscriptions FOR SELECT
  USING ((auth.uid() = user_id) OR (auth.uid() = profile_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Subscription status helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;
