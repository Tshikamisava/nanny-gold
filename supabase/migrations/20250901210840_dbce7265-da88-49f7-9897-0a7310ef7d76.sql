-- Update the calculate_booking_revenue function with correct production values
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid, 
  p_total_amount numeric, 
  p_booking_type text, 
  p_monthly_rate_estimate numeric DEFAULT NULL::numeric, 
  p_booking_days integer DEFAULT 1
)
RETURNS TABLE(
  fixed_fee numeric, 
  commission_percent numeric, 
  commission_amount numeric, 
  admin_total_revenue numeric, 
  nanny_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Long-term bookings: Check for 50% placement fee vs standard R2,500
    IF p_monthly_rate_estimate >= 7000.00 THEN
      -- Grand Retreat and Epic Estates: 50% of monthly total as placement fee
      v_fixed_fee := p_total_amount * 0.50;
    ELSE
      -- Pocket Palace and Family Hub: Standard R2,500 placement fee
      v_fixed_fee := 2500.00;
    END IF;
    
    v_commission_base := p_total_amount - v_fixed_fee;
    
    -- Sliding scale commission for long-term bookings with correct thresholds
    IF p_monthly_rate_estimate >= 10000.00 THEN
      v_commission_percent := 25.00; -- Premium homes: 25%
    ELSIF p_monthly_rate_estimate <= 5000.00 THEN
      v_commission_percent := 10.00; -- Budget homes: 10%
    ELSE
      v_commission_percent := 15.00; -- Standard homes: 15%
    END IF;
  ELSE
    -- Short-term bookings: R35 per day of booking (corrected from R3.50)
    v_fixed_fee := 35.00 * GREATEST(p_booking_days, 1); -- Ensure at least 1 day
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
$function$;