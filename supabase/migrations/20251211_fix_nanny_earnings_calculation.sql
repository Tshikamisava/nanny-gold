-- Fix nanny earnings calculation to subtract both fixed fee and commission
-- Bug: Short-term bookings were calculating nanny_earnings = total_amount - commission_amount
-- Correct: nanny_earnings should be = total_amount - fixed_fee - commission_amount

CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid, 
  p_total_amount numeric, 
  p_booking_type text, 
  p_monthly_rate_estimate numeric DEFAULT NULL::numeric,
  p_home_size text DEFAULT NULL::text
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
  v_monthly_rate DECIMAL := 0;
BEGIN
  -- Use monthly rate estimate or total amount as monthly rate
  v_monthly_rate := COALESCE(p_monthly_rate_estimate, p_total_amount);
  
  IF p_booking_type = 'long_term' THEN
    -- Placement fee calculation based on home size
    IF p_home_size IN ('Grand Retreat', 'Epic Estates') THEN
      -- Premium homes: 50% of monthly rate as placement fee
      v_fixed_fee := v_monthly_rate * 0.50;
    ELSE
      -- Standard homes (Pocket Palace, Family Hub): Fixed R2,500 placement fee
      v_fixed_fee := 2500.00;
    END IF;
    
    -- Commission calculation on FULL monthly rate (sliding scale)
    IF v_monthly_rate >= 10000 THEN
      v_commission_percent := 25; -- Premium homes: 25%
    ELSIF v_monthly_rate <= 5000 THEN
      v_commission_percent := 10; -- Budget homes: 10%
    ELSE
      v_commission_percent := 15; -- Standard homes: 15%
    END IF;
    
    -- Commission is calculated on the full monthly rate
    v_commission_amount := v_monthly_rate * (v_commission_percent / 100);
    
    -- Admin total revenue = placement fee + commission
    v_admin_total_revenue := v_fixed_fee + v_commission_amount;
    
    -- Nanny earnings = monthly rate minus commission (placement fee doesn't affect nanny)
    v_nanny_earnings := v_monthly_rate - v_commission_amount;
    
  ELSE
    -- Short-term bookings: R35 per day of booking
    -- Get number of days from booking
    DECLARE
      booking_days INTEGER := 1;
    BEGIN
      SELECT COALESCE(
        (SELECT DATE_PART('day', b.end_date - b.start_date) + 1 FROM public.bookings b WHERE b.id = p_booking_id),
        1
      ) INTO booking_days;
      
      v_fixed_fee := 35 * booking_days;
      v_commission_percent := 20; -- Flat 20% for short-term
      
      -- Commission on the total amount minus fixed fee
      v_commission_amount := (p_total_amount - v_fixed_fee) * (v_commission_percent / 100);
      v_admin_total_revenue := v_fixed_fee + v_commission_amount;
      
      -- FIX: Nanny earnings should subtract BOTH fixed fee and commission
      v_nanny_earnings := p_total_amount - v_fixed_fee - v_commission_amount;
    END;
  END IF;

  RETURN QUERY SELECT v_fixed_fee, v_commission_percent, v_commission_amount, v_admin_total_revenue, v_nanny_earnings;
END;
$function$;

-- Update any existing booking_financials records that have negative nanny_earnings
UPDATE booking_financials bf
SET nanny_earnings = b.total_monthly_cost - bf.fixed_fee - bf.commission_amount
FROM bookings b
WHERE bf.booking_id = b.id
  AND bf.nanny_earnings < 0
  AND b.booking_type IN ('short_term', 'hourly', 'daily');

-- Add a comment explaining the fix
COMMENT ON FUNCTION public.calculate_booking_revenue IS 
'Calculates revenue split for bookings. 
Long-term: placement fee (R2,500 or 50% for premium) + sliding scale commission (10-25%)
Short-term: R35/day fixed fee + 20% commission
Nanny earnings = total - fixed_fee - commission_amount';
