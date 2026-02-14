-- Fix sign-up process: Ensure handle_new_user function works correctly and trigger is enabled
-- This fixes the issue where nannies/clients register but their profiles aren't created

-- Step 1: Drop and recreate the handle_new_user function with correct syntax
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_type_val text;
  user_phone text;
  user_email text;
BEGIN
  -- Get user_type from raw_user_meta_data, default to 'client'
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  -- Extract phone number - check both phone field and raw_user_meta_data
  -- Make sure phone number is valid or null
  user_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  IF user_phone IS NOT NULL AND user_phone = '' THEN
    user_phone := NULL;
  END IF;
  
  -- Use auth email or fallback email from metadata
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  
  -- Insert into profiles table with all data
  INSERT INTO public.profiles (id, user_type, first_name, last_name, email, phone)
  VALUES (
    NEW.id,
    user_type_val::user_type,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    user_email,
    user_phone
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  -- Create specific profile based on user type
  IF user_type_val = 'nanny' THEN
    -- Create nanny profile with proper default service_categories
    INSERT INTO public.nannies (
      id, 
      experience_level, 
      hourly_rate, 
      monthly_rate, 
      bio, 
      languages, 
      skills, 
      certifications,
      approval_status,
      service_categories
    ) VALUES (
      NEW.id,
      '1-3'::experience_level,
      NULL,
      NULL,
      NULL,
      ARRAY['English'],
      ARRAY[]::text[],
      ARRAY[]::text[],
      'pending',
      ARRAY['long_term', 'live_out']::text[]
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if nanny profile already exists
  ELSIF user_type_val = 'client' THEN
    -- Create client profile
    INSERT INTO public.clients (id) 
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if client profile already exists
    
    -- Create client preferences record
    INSERT INTO public.client_preferences (
      client_id,
      living_arrangement,
      experience_level,
      pet_care,
      cooking,
      special_needs,
      ecd_training,
      montessori,
      backup_nanny,
      schedule,
      max_budget
    ) VALUES (
      NEW.id,
      NULL,
      '1-3'::experience_level,
      false,
      false,
      false,
      false,
      false,
      false,
      '{"monday": false, "tuesday": false, "wednesday": false, "thursday": false, "friday": false, "saturday": false, "sunday": false}'::jsonb,
      NULL
    )
    ON CONFLICT (client_id) DO NOTHING; -- Prevent errors if preferences already exist
  ELSIF user_type_val = 'admin' THEN
    -- Create admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING; -- Prevent errors if role already exists
    
    -- Also create admin profile if admins table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') THEN
      INSERT INTO public.admins (id, department, permissions)
      VALUES (NEW.id, 'General', '{"all": true}'::jsonb)
      ON CONFLICT (id) DO NOTHING; -- Prevent errors if admin profile already exists
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow auth user creation to succeed
    RETURN NEW;
END;
$$;

-- Step 2: Ensure the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Ensure RLS policies allow profile creation
-- Profiles table - allow inserts during signup (handled by trigger with SECURITY DEFINER)
-- But ensure users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Step 4: Ensure nannies can insert their own profile (for trigger)
DROP POLICY IF EXISTS "Nannies can create their profile" ON public.nannies;
CREATE POLICY "Nannies can create their profile" 
ON public.nannies 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Step 5: Ensure clients can insert their own profile (for trigger)
DROP POLICY IF EXISTS "Clients can create their own profile" ON public.clients;
CREATE POLICY "Clients can create their own profile" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Step 6: Ensure client_preferences can be created (for trigger)
DROP POLICY IF EXISTS "Clients can manage their preferences" ON public.client_preferences;
CREATE POLICY "Clients can manage their preferences" 
ON public.client_preferences 
FOR ALL 
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

