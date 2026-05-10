-- Backfill billing_interval on existing subscriptions from price_id suffix
UPDATE public.subscriptions
SET billing_interval = CASE
  WHEN price_id LIKE '%_yearly' THEN 'year'
  WHEN price_id LIKE '%_monthly' THEN 'month'
  ELSE billing_interval
END
WHERE billing_interval IS NULL AND price_id IS NOT NULL;