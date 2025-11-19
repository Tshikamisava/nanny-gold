-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Create function to get admin permissions
CREATE OR REPLACE FUNCTION public.get_admin_permissions(_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'nannies', true,
    'clients', true,
    'bookings', true,
    'support', true,
    'verification', true,
    'payments', public.has_role(_user_id, 'super_admin'),
    'analytics', public.has_role(_user_id, 'super_admin'),
    'user_management', public.has_role(_user_id, 'super_admin'),
    'professional_development', public.has_role(_user_id, 'super_admin')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_super_admin());

-- Insert yourself as super admin (replace with your actual user ID after authentication)
-- This will need to be done manually after you authenticate