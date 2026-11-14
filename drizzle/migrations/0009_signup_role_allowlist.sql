-- Sign-up metadata is written by the browser, so it must never be trusted to
-- grant a privileged role. Before this, `role: "admin"` in the sign-up
-- metadata produced an admin account.
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

  -- Sign-up metadata is written by the browser, so it may only choose between
  -- the two self-service roles. Admin is never granted at sign-up.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id,
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'retailer'
      THEN 'retailer'::public.app_role
      ELSE 'consumer'::public.app_role
    END);

  INSERT INTO public.consumer_profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
