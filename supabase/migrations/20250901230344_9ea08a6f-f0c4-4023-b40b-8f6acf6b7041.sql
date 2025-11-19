-- Fix the booking_financials table structure and recalculate data
-- First, ensure booking_financials table exists with proper structure
CREATE TABLE IF NOT EXISTS public.booking_financials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE,
  fixed_fee numeric DEFAULT 0,
  commission_percent numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  admin_total_revenue numeric DEFAULT 0,
  nanny_earnings numeric DEFAULT 0,
  calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for booking_financials if they don't exist
DO $$
BEGIN
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'booking_financials' AND relrowsecurity = true
  ) THEN
    ALTER TABLE public.booking_financials ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Admins can manage all booking financials"
ON public.booking_financials FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY IF NOT EXISTS "Users can view their booking financials"
ON public.booking_financials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_financials.booking_id 
    AND (b.client_id = auth.uid() OR b.nanny_id = auth.uid())
  )
);

-- Now recalculate booking financials for existing bookings
DO $$
DECLARE
  booking_record RECORD;
  revenue_data RECORD;
BEGIN
  -- Loop through confirmed bookings that have base_rate
  FOR booking_record IN 
    SELECT id, base_rate, booking_type, home_size, total_monthly_cost
    FROM public.bookings 
    WHERE status IN ('confirmed', 'active', 'completed')
      AND base_rate IS NOT NULL
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
    
    -- Insert or update booking financials
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
  
  RAISE NOTICE 'Successfully recalculated financial data for all bookings';
END $$;