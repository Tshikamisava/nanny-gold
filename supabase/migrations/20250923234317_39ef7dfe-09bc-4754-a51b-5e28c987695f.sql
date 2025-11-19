-- Fix security warning: Add proper search_path to validation function
CREATE OR REPLACE FUNCTION public.validate_booking_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If duration_type is long_term, clear short-term specific fields
  IF NEW.duration_type = 'long_term' THEN
    NEW.booking_sub_type := NULL;
    NEW.selected_dates := NULL;
    NEW.time_slots := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;