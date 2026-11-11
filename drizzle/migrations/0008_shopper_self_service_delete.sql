GRANT DELETE ON public.tryon_results TO authenticated;
CREATE POLICY "Users delete own tryon_results" ON public.tryon_results
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can delete own tryons" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'tryons' AND (storage.foldername(name))[1] = (auth.uid())::text);

ALTER TABLE public.subscriptions ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_profile_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.try_on_credits ALTER COLUMN user_id DROP NOT NULL;