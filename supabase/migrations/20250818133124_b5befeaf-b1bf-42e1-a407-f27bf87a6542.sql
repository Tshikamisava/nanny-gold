-- Add admin access policy for profiles table
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin());

-- Add admin update policy for profiles table  
CREATE POLICY "Admins can update all profiles"
ON public.profiles 
FOR UPDATE 
USING (is_admin());