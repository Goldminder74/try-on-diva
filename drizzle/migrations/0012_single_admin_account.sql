-- Wigsmi has exactly one administrator account. The admin role cannot be
-- given to any other account, by anyone, through any route. Applied to the
-- live database on 14 November 2026.
CREATE OR REPLACE FUNCTION public.guard_admin_role()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'admin'::public.app_role AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = NEW.user_id AND lower(u.email) = 'info@wigsmi.com' AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Only the Wigsmi owner account can hold the admin role.';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_admin_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_admin_role ON public.user_roles;
CREATE TRIGGER guard_admin_role BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role();

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
WHERE lower(u.email) = 'info@wigsmi.com'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'::public.app_role);
