
CREATE TABLE IF NOT EXISTS public.retailer_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL,
  event_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (retailer_id, event_type)
);

ALTER TABLE public.retailer_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lifecycle events: retailer/admin read"
  ON public.retailer_lifecycle_events FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.retailers r
      WHERE r.id = retailer_lifecycle_events.retailer_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Lifecycle events: service manage"
  ON public.retailer_lifecycle_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.wigs
  ADD COLUMN IF NOT EXISTS auto_unpublished_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wigs_auto_unpublished_at
  ON public.wigs (retailer_id)
  WHERE auto_unpublished_at IS NOT NULL;
