-- Fix RLS policies for user_roles table to allow self-registration for development
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only admins can assign admin roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_roles;

-- Create new policies that allow development mode user creation
CREATE POLICY "Anyone can view their own roles" 
ON user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create their own admin role in development" 
ON user_roles FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  (role != 'admin' OR 
   -- Allow admin role creation in development mode (when using dev emails)
   (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@nannygold.dev'
  )
);

CREATE POLICY "Admins can manage all roles" 
ON user_roles FOR ALL 
USING (is_admin());

-- Also fix the profiles table to allow proper insertion during development
-- Drop existing profile policies that might be too restrictive  
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create more permissive policies for development
CREATE POLICY "Users can manage their own profile" 
ON profiles FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Fix admins table policies
DROP POLICY IF EXISTS "Admins can insert their own profile" ON admins;
DROP POLICY IF EXISTS "Admins can update their own profile" ON admins;
DROP POLICY IF EXISTS "Admins can view their own profile" ON admins;
DROP POLICY IF EXISTS "System admins can manage all admin profiles" ON admins;

CREATE POLICY "Admins can manage their own profile" 
ON admins FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "System admins can manage all admin profiles" 
ON admins FOR ALL 
USING (is_admin());