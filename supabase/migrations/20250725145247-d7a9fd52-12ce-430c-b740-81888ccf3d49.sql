-- Create booking_financials table for revenue breakdown
CREATE TABLE public.booking_financials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL,
  fixed_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  commission_source TEXT DEFAULT 'sliding_scale',
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  admin_total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  nanny_earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nanny_payouts table for tracking payouts
CREATE TABLE public.nanny_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'bank_transfer',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_booking_financials_booking_id ON public.booking_financials(booking_id);
CREATE INDEX idx_booking_financials_booking_type ON public.booking_financials(booking_type);
CREATE INDEX idx_nanny_payouts_booking_id ON public.nanny_payouts(booking_id);
CREATE INDEX idx_nanny_payouts_nanny_id ON public.nanny_payouts(nanny_id);
CREATE INDEX idx_nanny_payouts_status ON public.nanny_payouts(status);

-- Enable RLS
ALTER TABLE public.booking_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nanny_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking_financials
CREATE POLICY "Admins can view all booking financials" ON public.booking_financials
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert booking financials" ON public.booking_financials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update booking financials" ON public.booking_financials
  FOR UPDATE USING (true);

-- RLS policies for nanny_payouts
CREATE POLICY "Admins can manage all payouts" ON public.nanny_payouts
  FOR ALL USING (is_admin());

CREATE POLICY "Nannies can view their own payouts" ON public.nanny_payouts
  FOR SELECT USING (nanny_id = auth.uid());

-- Function to calculate revenue breakdown
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id UUID,
  p_total_amount DECIMAL,
  p_booking_type TEXT,
  p_monthly_rate_estimate DECIMAL DEFAULT NULL
)
RETURNS TABLE(
  fixed_fee DECIMAL,
  commission_percent DECIMAL,
  commission_amount DECIMAL,
  admin_total_revenue DECIMAL,
  nanny_earnings DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_fixed_fee DECIMAL := 0;
  v_commission_percent DECIMAL := 0;
  v_commission_amount DECIMAL := 0;
  v_admin_total_revenue DECIMAL := 0;
  v_nanny_earnings DECIMAL := 0;
  v_commission_base DECIMAL := 0;
BEGIN
  -- Set fixed fees based on booking type
  IF p_booking_type = 'long_term' THEN
    v_fixed_fee := 2500.00; -- R2,500 placement fee
    v_commission_base := p_total_amount - v_fixed_fee;
    
    -- Sliding scale commission for long-term bookings
    IF p_monthly_rate_estimate > 10000 THEN
      v_commission_percent := 25.00;
    ELSIF p_monthly_rate_estimate < 5000 THEN
      v_commission_percent := 10.00;
    ELSE
      v_commission_percent := 15.00;
    END IF;
  ELSE
    -- Short-term bookings
    v_fixed_fee := 35.00; -- R35 service fee
    v_commission_percent := 20.00; -- Flat 20%
    v_commission_base := p_total_amount - v_fixed_fee;
  END IF;
  
  -- Calculate commission amount
  v_commission_amount := v_commission_base * (v_commission_percent / 100);
  
  -- Calculate totals
  v_admin_total_revenue := v_fixed_fee + v_commission_amount;
  v_nanny_earnings := p_total_amount - v_commission_amount;
  
  -- Return calculated values
  RETURN QUERY SELECT 
    v_fixed_fee,
    v_commission_percent,
    v_commission_amount,
    v_admin_total_revenue,
    v_nanny_earnings;
END;
$$;