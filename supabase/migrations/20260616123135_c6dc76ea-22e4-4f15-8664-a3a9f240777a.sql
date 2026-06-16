
-- tryon_events table
CREATE TABLE public.tryon_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  wig_id text NOT NULL,
  result_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tryon_events TO authenticated;
GRANT INSERT ON public.tryon_events TO anon;
GRANT ALL ON public.tryon_events TO service_role;

ALTER TABLE public.tryon_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tryon events"
  ON public.tryon_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own tryon events"
  ON public.tryon_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous can insert anonymous tryon events"
  ON public.tryon_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE INDEX tryon_events_user_id_idx ON public.tryon_events(user_id);
CREATE INDEX tryon_events_created_at_idx ON public.tryon_events(created_at DESC);

-- Storage policies on the "tryons" bucket
CREATE POLICY "Public read access for tryons"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tryons');

CREATE POLICY "Authenticated users can upload tryons to their folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tryons' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anonymous can upload tryons to anon folder"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'tryons' AND (storage.foldername(name))[1] = 'anon');
