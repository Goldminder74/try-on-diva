ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_source text, ADD COLUMN IF NOT EXISTS utm_medium text, ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.anonymous_tryons ADD COLUMN IF NOT EXISTS utm_source text, ADD COLUMN IF NOT EXISTS utm_medium text, ADD COLUMN IF NOT EXISTS utm_campaign text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, utm_source, utm_medium, utm_campaign)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    left(NULLIF(NEW.raw_user_meta_data->>'utm_source', ''), 200),
    left(NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''), 200),
    left(NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''), 200));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'consumer'));

  INSERT INTO public.consumer_profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;