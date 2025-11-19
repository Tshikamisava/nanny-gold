-- Fix security warning: Add search_path to the new function
CREATE OR REPLACE FUNCTION validate_booking_financials()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate nanny earnings are never negative
  IF NEW.nanny_earnings < 0 THEN
    RAISE EXCEPTION 'Nanny earnings cannot be negative: %', NEW.nanny_earnings;
  END IF;
  
  -- Validate admin revenue is reasonable
  IF NEW.admin_total_revenue < 0 THEN
    RAISE EXCEPTION 'Admin revenue cannot be negative: %', NEW.admin_total_revenue;
  END IF;
  
  RETURN NEW;
END;
$$;