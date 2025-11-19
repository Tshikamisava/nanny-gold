-- Fix the booking_financials table and recalculate without referencing home_size yet
-- First ensure the table structure is correct
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

-- Enable RLS
ALTER TABLE public.booking_financials ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Admins can manage all booking financials" ON public.booking_financials;
DROP POLICY IF EXISTS "Users can view their booking financials" ON public.booking_financials;

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

-- Recalculate financial data for existing long-term bookings (without home_size logic for now)
INSERT INTO public.booking_financials (booking_id, fixed_fee, commission_percent, commission_amount, admin_total_revenue, nanny_earnings)
SELECT 
  b.id,
  2500.00 as fixed_fee, -- Use standard R2,500 placement fee for all for now
  CASE 
    WHEN b.base_rate >= 10000 THEN 25
    WHEN b.base_rate <= 5000 THEN 10
    ELSE 15
  END as commission_percent,
  b.base_rate * (
    CASE 
      WHEN b.base_rate >= 10000 THEN 0.25
      WHEN b.base_rate <= 5000 THEN 0.10
      ELSE 0.15
    END
  ) as commission_amount,
  2500.00 + (b.base_rate * (
    CASE 
      WHEN b.base_rate >= 10000 THEN 0.25
      WHEN b.base_rate <= 5000 THEN 0.10
      ELSE 0.15
    END
  )) as admin_total_revenue,
  b.base_rate - (b.base_rate * (
    CASE 
      WHEN b.base_rate >= 10000 THEN 0.25
      WHEN b.base_rate <= 5000 THEN 0.10
      ELSE 0.15
    END
  )) as nanny_earnings
FROM public.bookings b
WHERE b.booking_type = 'long_term' 
  AND b.base_rate IS NOT NULL
  AND b.status IN ('confirmed', 'active', 'completed')
ON CONFLICT (booking_id) DO UPDATE SET
  fixed_fee = EXCLUDED.fixed_fee,
  commission_percent = EXCLUDED.commission_percent,
  commission_amount = EXCLUDED.commission_amount,
  admin_total_revenue = EXCLUDED.admin_total_revenue,
  nanny_earnings = EXCLUDED.nanny_earnings,
  updated_at = now();