
DROP TABLE IF EXISTS public.tryon_events CASCADE;

CREATE TABLE public.tryon_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wig_id text NOT NULL,
  result_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tryon_results_user_id_idx ON public.tryon_results(user_id);
CREATE INDEX tryon_results_created_at_idx ON public.tryon_results(created_at DESC);

GRANT SELECT, INSERT ON public.tryon_results TO authenticated;
GRANT ALL ON public.tryon_results TO service_role;

ALTER TABLE public.tryon_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own tryon_results"
  ON public.tryon_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users select own tryon_results"
  ON public.tryon_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
