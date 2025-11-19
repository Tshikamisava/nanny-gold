-- Function to set up super admin using email
CREATE OR REPLACE FUNCTION public.setup_super_admin(admin_email text)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- Insert super_admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create admin profile if it doesn't exist
  INSERT INTO public.admins (id, department, permissions, admin_level)
  VALUES (admin_user_id, 'Executive', '{"all": true}'::jsonb, 'super_admin')
  ON CONFLICT (id) DO UPDATE SET admin_level = 'super_admin';
  
  RETURN admin_user_id;
END;
$$;