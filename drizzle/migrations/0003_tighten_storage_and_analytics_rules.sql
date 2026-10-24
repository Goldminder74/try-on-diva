DROP POLICY IF EXISTS "Analytics: insert authenticated" ON public.analytics_events;
DROP POLICY IF EXISTS "Anon can read tryons in anon folder" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous can upload tryons to anon folder" ON storage.objects;
DROP POLICY IF EXISTS "Wig images authed listing" ON storage.objects;