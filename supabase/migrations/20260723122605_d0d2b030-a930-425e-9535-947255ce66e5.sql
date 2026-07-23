CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_is_master BOOLEAN;
BEGIN
  v_email := LOWER(COALESCE(NEW.email, ''));
  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(v_email, '@', 1));
  v_is_master := v_email = 'gabrielfurtados@hotmail.com';

  INSERT INTO public.profiles (id, full_name, email, status)
  VALUES (
    NEW.id,
    v_full_name,
    v_email,
    CASE WHEN v_is_master THEN 'approved'::approval_status ELSE 'pending'::approval_status END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      status = CASE WHEN v_is_master THEN 'approved'::approval_status ELSE public.profiles.status END,
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_is_master THEN 'admin'::app_role ELSE 'tecnico'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

UPDATE public.profiles
SET status = 'approved'::approval_status,
    updated_at = now()
WHERE lower(email) = 'gabrielfurtados@hotmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE lower(email) = 'gabrielfurtados@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;