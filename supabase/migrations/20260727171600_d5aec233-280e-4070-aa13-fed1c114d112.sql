CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_is_master BOOLEAN;
BEGIN
  v_email := LOWER(COALESCE(NEW.email, ''));
  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(v_email, '@', 1));
  v_is_master := v_email = 'gabrielfurtados@hotmail.com';
  INSERT INTO public.profiles (id, full_name, email, status)
  VALUES (NEW.id, v_full_name, v_email, 'approved'::approval_status)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, email = EXCLUDED.email,
        status = 'approved'::approval_status, updated_at = now();
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_is_master THEN 'admin'::app_role ELSE 'tecnico'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user falhou para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;