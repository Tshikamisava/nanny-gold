-- Create function to bypass RLS for development mode client profile creation
CREATE OR REPLACE FUNCTION public.create_dev_client_profile(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.clients (id) VALUES (p_user_id);
END;
$$;

-- Create function to bypass RLS for development mode admin role creation
CREATE OR REPLACE FUNCTION public.create_dev_admin_role(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'admin');
END;
$$;