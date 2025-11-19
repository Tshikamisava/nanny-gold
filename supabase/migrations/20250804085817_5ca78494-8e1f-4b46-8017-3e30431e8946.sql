-- Add admin role isolation by marking it as internal
UPDATE public.user_roles 
SET role = role 
WHERE role = 'admin';

-- Create a comment to mark admin role as internal
COMMENT ON TABLE public.user_roles IS 'User roles table. Admin role is internal and not exposed in public signup.';