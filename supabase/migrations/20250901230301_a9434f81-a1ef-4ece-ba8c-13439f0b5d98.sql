-- Recalculate existing booking financials with corrected logic
-- First, let's add home_size column to bookings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'home_size'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN home_size text;
  END IF;
END $$;

-- Update existing bookings with estimated home size based on monthly rate
-- This is a temporary assignment for demonstration purposes
UPDATE public.bookings 
SET home_size = CASE 
  WHEN base_rate >= 10000 THEN 'Grand Retreat'
  WHEN base_rate >= 7000 THEN 'Epic Estates' 
  WHEN base_rate >= 5000 THEN 'Family Hub'
  ELSE 'Pocket Palace'
END
WHERE home_size IS NULL AND booking_type = 'long_term';

-- Create a function to recalculate all booking financials
CREATE OR REPLACE FUNCTION public.recalculate_all_booking_financials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  booking_record RECORD;
  revenue_data RECORD;
BEGIN
  -- Loop through all confirmed bookings
  FOR booking_record IN 
    SELECT id, base_rate, booking_type, home_size, total_monthly_cost
    FROM public.bookings 
    WHERE status IN ('confirmed', 'active', 'completed')
  LOOP
    -- Calculate corrected revenue breakdown
    SELECT * INTO revenue_data 
    FROM public.calculate_booking_revenue(
      booking_record.id,
      COALESCE(booking_record.total_monthly_cost, booking_record.base_rate),
      booking_record.booking_type,
      booking_record.base_rate,
      booking_record.home_size
    );
    
    -- Update or insert booking financials
    INSERT INTO public.booking_financials (
      booking_id,
      fixed_fee,
      commission_percent,
      commission_amount,
      admin_total_revenue,
      nanny_earnings,
      calculated_at
    ) VALUES (
      booking_record.id,
      revenue_data.fixed_fee,
      revenue_data.commission_percent,
      revenue_data.commission_amount,
      revenue_data.admin_total_revenue,
      revenue_data.nanny_earnings,
      now()
    )
    ON CONFLICT (booking_id) 
    DO UPDATE SET
      fixed_fee = EXCLUDED.fixed_fee,
      commission_percent = EXCLUDED.commission_percent,
      commission_amount = EXCLUDED.commission_amount,
      admin_total_revenue = EXCLUDED.admin_total_revenue,
      nanny_earnings = EXCLUDED.nanny_earnings,
      calculated_at = EXCLUDED.calculated_at,
      updated_at = now();
      
  END LOOP;
  
  -- Log the recalculation
  RAISE NOTICE 'Recalculated financial data for all bookings';
END;
$function$;

-- Execute the recalculation
SELECT public.recalculate_all_booking_financials();