-- Phase 2: Auto-generate initial invoice on booking creation
-- This trigger automatically generates an invoice when a new booking is created

CREATE OR REPLACE FUNCTION public.trigger_auto_generate_invoice()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url text;
  service_role_key text;
BEGIN
  -- Get the Supabase function URL and service role key
  function_url := 'https://msawldkygbsipjmjuyue.supabase.co/functions/v1/generate-booking-invoice';
  
  -- Get service role key from vault (if available) or use environment variable
  BEGIN
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key' 
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      -- If vault access fails, the edge function will use its own service role key
      service_role_key := NULL;
  END;
  
  -- Call edge function asynchronously to generate invoice
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
      ),
      body := jsonb_build_object('booking_id', NEW.id)
    );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block booking creation
    RAISE WARNING 'Error in trigger_auto_generate_invoice for booking %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_booking_created_generate_invoice ON public.bookings;

-- Create trigger on bookings table (AFTER INSERT)
CREATE TRIGGER on_booking_created_generate_invoice
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_generate_invoice();

-- Add comment for documentation
COMMENT ON FUNCTION public.trigger_auto_generate_invoice() IS 
'Automatically generates an invoice when a new booking is created. Calculates placement fee using corrected logic: R2,500 for pocket_palace/family_hub, 50% of base rate for grand_retreat/epic_estates.';

COMMENT ON TRIGGER on_booking_created_generate_invoice ON public.bookings IS 
'Triggers invoice generation after booking insertion. Calls generate-booking-invoice edge function asynchronously.';