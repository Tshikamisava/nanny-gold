-- Update existing nannies to have explicit service categories
-- All nannies can do live-out, some can do live-in

-- Step 1: Update nannies who don't have 'live_in' to explicitly show 'live_out'
UPDATE nannies 
SET service_categories = array_append(
  COALESCE(service_categories, ARRAY['long_term']::text[]), 
  'live_out'
)
WHERE 'live_out' != ALL(COALESCE(service_categories, ARRAY[]::text[]))
  AND 'live_in' != ALL(COALESCE(service_categories, ARRAY[]::text[]))
  AND approval_status = 'approved';

-- Step 2: Update nannies with live_in to also have live_out (since they can do both)
UPDATE nannies 
SET service_categories = array_append(
  service_categories, 
  'live_out'
)
WHERE 'live_in' = ANY(service_categories)
  AND 'live_out' != ALL(COALESCE(service_categories, ARRAY[]::text[]))
  AND approval_status = 'approved';

-- Step 3: Update the handle_new_user() function to set proper defaults for new nannies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Get user_type from raw_user_meta_data, default to 'client'
  DECLARE
    user_type_val text;
    user_phone text;
    user_email text;
  BEGIN
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
    );
    
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
        ARRAY['long_term', 'live_out']::text[] -- NEW: Default to long_term + live_out
      );
    ELSIF user_type_val = 'client' THEN
      -- Create client profile
      INSERT INTO public.clients (id) VALUES (NEW.id);
      
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
      );
    ELSIF user_type_val = 'admin' THEN
      -- Create admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin');
      
      -- Also create admin profile
      INSERT INTO public.admins (id, department, permissions)
      VALUES (NEW.id, 'General', '{"all": true}'::jsonb);
    END IF;
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't block user creation
      RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$function$;