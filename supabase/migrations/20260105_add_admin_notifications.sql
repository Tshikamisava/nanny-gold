-- Create admin_notifications table to log new user registrations
CREATE TABLE public.admin_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Update handle_new_user function to log new user registrations
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
    user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');

    -- Insert into profiles table with all data
    INSERT INTO public.profiles (id, user_type, first_name, last_name, email, phone)
    VALUES (
      NEW.id,
      user_type_val::user_type,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      user_email,
      COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone')
    );

    -- Log the new user registration in admin_notifications
    INSERT INTO public.admin_notifications (user_id, user_type, email)
    VALUES (NEW.id, user_type_val, user_email);

    -- Create specific profile based on user type
    IF user_type_val = 'nanny' THEN
      INSERT INTO public.nannies (
        id, experience_level, hourly_rate, monthly_rate, bio, languages, skills, certifications, approval_status, service_categories
      ) VALUES (
        NEW.id, '1-3'::experience_level, NULL, NULL, NULL, ARRAY['English'], ARRAY[]::text[], ARRAY[]::text[], 'pending', ARRAY['long_term', 'live_out']::text[]
      );
    ELSIF user_type_val = 'client' THEN
      INSERT INTO public.clients (id) VALUES (NEW.id);
      INSERT INTO public.client_preferences (
        client_id, living_arrangement, experience_level, pet_care, cooking, special_needs, ecd_training, montessori, backup_nanny, schedule, max_budget
      ) VALUES (
        NEW.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
      );
    END IF;

    RETURN NEW;
  END;
END;
$function$;