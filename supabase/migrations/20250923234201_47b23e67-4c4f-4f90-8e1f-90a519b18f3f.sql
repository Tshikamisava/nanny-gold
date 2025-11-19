-- Clean up corrupted booking data for long-term bookings
-- This fixes the issue where long-term bookings have incorrect booking_sub_type values

-- Update client_preferences to clear booking_sub_type for long_term bookings
UPDATE public.client_preferences 
SET 
  booking_sub_type = NULL,
  selected_dates = NULL,
  time_slots = NULL,
  updated_at = now()
WHERE duration_type = 'long_term' 
  AND booking_sub_type IS NOT NULL;

-- Update clients table to map legacy home_size values to proper constants
UPDATE public.clients
SET 
  home_size = CASE 
    WHEN home_size = 'small' THEN 'pocket_palace'
    WHEN home_size = 'medium' THEN 'family_hub'
    WHEN home_size = 'large' THEN 'grand_retreat'
    WHEN home_size = 'extra_large' THEN 'epic_estates'
    ELSE home_size -- Keep existing proper values
  END,
  updated_at = now()
WHERE home_size IN ('small', 'medium', 'large', 'extra_large');

-- Add a function to prevent future data corruption
CREATE OR REPLACE FUNCTION public.validate_booking_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- If duration_type is long_term, clear short-term specific fields
  IF NEW.duration_type = 'long_term' THEN
    NEW.booking_sub_type := NULL;
    NEW.selected_dates := NULL;
    NEW.time_slots := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically validate preferences on insert/update
DROP TRIGGER IF EXISTS validate_booking_preferences_trigger ON public.client_preferences;
CREATE TRIGGER validate_booking_preferences_trigger
  BEFORE INSERT OR UPDATE ON public.client_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_preferences();