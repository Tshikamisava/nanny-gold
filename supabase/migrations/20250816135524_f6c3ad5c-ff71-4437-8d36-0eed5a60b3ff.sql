-- Update the setup_super_admin function to use 'admin' instead of 'super_admin'
CREATE OR REPLACE FUNCTION public.setup_super_admin(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find user by email in profiles
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Insert admin role if it doesn't exist (use 'admin' not 'super_admin')
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create admin profile if it doesn't exist
  INSERT INTO public.admins (id, department, permissions, admin_level)
  VALUES (admin_user_id, 'Executive', '{"all": true}'::jsonb, 'super_admin')
  ON CONFLICT (id) DO UPDATE SET admin_level = 'super_admin', permissions = '{"all": true}'::jsonb;
  
  RETURN admin_user_id;
END;
$function$;