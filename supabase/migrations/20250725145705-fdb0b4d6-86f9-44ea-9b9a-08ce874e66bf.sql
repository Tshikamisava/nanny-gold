-- Fix security warning for the calculate_booking_revenue function
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
SECURITY DEFINER
SET search_path TO 'public'
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