-- Phase 3: Disable problematic invoice generation trigger

-- Drop existing trigger that calls net.http_post (requires pg_net extension)
DROP TRIGGER IF EXISTS on_booking_created_generate_invoice ON public.bookings;

-- Replace function with stub that logs instead of calling edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_generate_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log that invoice generation is disabled
  RAISE NOTICE 'Invoice generation trigger disabled - requires pg_net extension. Booking ID: %. Invoices must be generated manually via admin panel.', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block booking creation
    RAISE WARNING 'Error in trigger_auto_generate_invoice for booking %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Phase 5: Enable real-time replica identity (realtime publication already exists)
ALTER TABLE public.bookings REPLICA IDENTITY FULL;