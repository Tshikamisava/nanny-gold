-- Simple migration to set up the basic structure
-- Add home_size column to bookings table 
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS home_size text;

-- Update existing bookings with estimated home size based on monthly rate
UPDATE public.bookings 
SET home_size = CASE 
  WHEN base_rate >= 10000 THEN 'Grand Retreat'
  WHEN base_rate >= 7000 THEN 'Epic Estates' 
  WHEN base_rate >= 5000 THEN 'Family Hub'
  ELSE 'Pocket Palace'
END
WHERE home_size IS NULL AND booking_type = 'long_term' AND base_rate IS NOT NULL;

-- Ensure booking_financials table has proper structure
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

-- Enable RLS on booking_financials
ALTER TABLE public.booking_financials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Admins can manage all booking financials" ON public.booking_financials;
DROP POLICY IF EXISTS "Users can view their booking financials" ON public.booking_financials;

-- Create RLS policies for booking_financials
CREATE POLICY "Admins can manage all booking financials"
ON public.booking_financials FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their booking financials"
ON public.booking_financials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_financials.booking_id 
    AND (b.client_id = auth.uid() OR b.nanny_id = auth.uid())
  )
);