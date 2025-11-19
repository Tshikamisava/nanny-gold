-- Fix user profile creation and role assignment issues

-- First, let's update the handle_new_user function to properly handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  user_type_val text;
BEGIN
  -- Get user_type from raw_user_meta_data
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, user_type, first_name, last_name, email, phone)
  VALUES (
    NEW.id,
    user_type_val::user_type,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Create specific profile based on user type
  IF user_type_val = 'nanny' THEN
    -- Create nanny profile
    INSERT INTO public.nannies (
      id, 
      experience_level, 
      hourly_rate, 
      monthly_rate, 
      bio, 
      languages, 
      skills, 
      certifications,
      approval_status
    ) VALUES (
      NEW.id,
      '1-3'::experience_level,
      0,
      0,
      '',
      '{}',
      '{}', 
      '{}',
      'pending'
    );
  ELSIF user_type_val = 'client' THEN
    -- Create client profile
    INSERT INTO public.clients (id) VALUES (NEW.id);
  ELSIF user_type_val = 'admin' THEN
    -- Create admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Update RLS policies for nannies table to allow self-insertion during signup
DROP POLICY IF EXISTS "Nannies can create their profile" ON public.nannies;
CREATE POLICY "Nannies can create their profile" 
ON public.nannies 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();