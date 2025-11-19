-- Update financial calculation for short-term bookings to R35 per day
-- Instead of flat R35 service fee, calculate R35 per day of booking

CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid, 
  p_total_amount numeric, 
  p_booking_type text, 
  p_monthly_rate_estimate numeric DEFAULT NULL,
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
SET search_path = 'public'
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
    -- Short-term bookings: R35 per day of booking
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

-- Update the booking service calls to include booking days
-- Add a helper function to calculate booking days from date range
CREATE OR REPLACE FUNCTION public.calculate_booking_days(start_date date, end_date date DEFAULT NULL)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE 
    WHEN end_date IS NULL THEN 1
    ELSE GREATEST(1, (end_date - start_date + 1))
  END;
$function$;