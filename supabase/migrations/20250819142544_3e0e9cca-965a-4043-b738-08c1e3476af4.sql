-- Update the commission logic for testing with lower thresholds
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(p_booking_id uuid, p_total_amount numeric, p_booking_type text, p_monthly_rate_estimate numeric DEFAULT NULL::numeric, p_booking_days integer DEFAULT 1)
 RETURNS TABLE(fixed_fee numeric, commission_percent numeric, commission_amount numeric, admin_total_revenue numeric, nanny_earnings numeric)
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
    -- Check home size for placement fee structure
    IF p_monthly_rate_estimate > 7.00 THEN
      -- Large and Monumental homes: 50% of monthly total as placement fee
      v_fixed_fee := p_total_amount * 0.50;
    ELSE
      -- Small and Medium homes: R2.50 placement fee
      v_fixed_fee := 2.50;
    END IF;
    
    v_commission_base := p_total_amount - v_fixed_fee;
    
    -- Updated sliding scale commission for long-term bookings (testing thresholds)
    IF p_monthly_rate_estimate > 10.00 THEN
      v_commission_percent := 25.00;
    ELSIF p_monthly_rate_estimate < 5.00 THEN
      v_commission_percent := 10.00;
    ELSE
      v_commission_percent := 15.00;
    END IF;
  ELSE
    -- Short-term bookings: R3.50 per day of booking (updated from R35)
    v_fixed_fee := 3.50 * GREATEST(p_booking_days, 1); -- Ensure at least 1 day
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