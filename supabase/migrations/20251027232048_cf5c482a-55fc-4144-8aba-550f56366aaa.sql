-- Add 5-parameter calculate_booking_revenue overload
-- Required by: process-booking-payment edge function
-- Purpose: Fix production payment processing and eliminate RPC resolution errors

CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid,
  p_total_amount numeric,
  p_booking_type text,
  p_monthly_rate_estimate numeric,
  p_booking_days integer
)
RETURNS TABLE(
  fixed_fee numeric,
  commission_percent numeric,
  commission_amount numeric,
  nanny_earnings numeric,
  admin_total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_placement_fee numeric := 0;
  v_commission_percent numeric := 10;
  v_commission_amount numeric;
  v_nanny_earnings numeric;
  v_admin_revenue numeric;
  v_booking_record record;
BEGIN
  -- Fetch booking details to determine placement fee and commission tier
  SELECT b.home_size, b.living_arrangement, b.total_monthly_cost
  INTO v_booking_record
  FROM bookings b
  WHERE b.id = p_booking_id;
  
  -- Apply sliding scale commission based on total amount
  -- Tier 1: <5000 = 10%
  -- Tier 2: 5000-9999 = 15%
  -- Tier 3: 10000-11999 = 20%
  -- Tier 4: 12000+ = 25%
  IF p_total_amount >= 12000 THEN
    v_commission_percent := 25;
  ELSIF p_total_amount >= 10000 THEN
    v_commission_percent := 20;
  ELSIF p_total_amount >= 5000 THEN
    v_commission_percent := 15;
  ELSE
    v_commission_percent := 10;
  END IF;
  
  -- Calculate placement fee for long-term bookings based on home size
  IF p_booking_type = 'long_term' AND v_booking_record.home_size IS NOT NULL THEN
    CASE v_booking_record.home_size
      WHEN 'pocket_palace' THEN v_placement_fee := 2000;
      WHEN 'family_hub' THEN v_placement_fee := 3000;
      WHEN 'grand_retreat' THEN v_placement_fee := 4000;
      WHEN 'epic_estates' THEN v_placement_fee := 5000;
      ELSE v_placement_fee := 2000;
    END CASE;
  END IF;
  
  -- Calculate final financial breakdown
  v_commission_amount := ROUND(p_total_amount * v_commission_percent / 100, 2);
  v_nanny_earnings := p_total_amount - v_commission_amount;
  v_admin_revenue := v_commission_amount + v_placement_fee;
  
  -- Return calculated financials
  RETURN QUERY SELECT 
    v_placement_fee as fixed_fee,
    v_commission_percent as commission_percent,
    v_commission_amount as commission_amount,
    v_nanny_earnings as nanny_earnings,
    v_admin_revenue as admin_total_revenue;
END;
$function$;

COMMENT ON FUNCTION public.calculate_booking_revenue(uuid, numeric, text, numeric, integer) IS 
'Calculate booking revenue with booking_id lookup. Used by process-booking-payment edge function. Returns TABLE with financial breakdown including placement fees and sliding scale commission.';