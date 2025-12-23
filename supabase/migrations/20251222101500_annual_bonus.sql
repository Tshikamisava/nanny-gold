-- Migration: Annual Bonus
-- Description: Adds bonus contribution tracking.

-- 1. Add column to booking_financials
ALTER TABLE public.booking_financials 
ADD COLUMN IF NOT EXISTS bonus_contribution NUMERIC(10, 2) DEFAULT 0;

-- 2. Update calculate_booking_revenue function
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid, 
  p_client_total numeric, 
  p_booking_type text, 
  p_living_arrangement text DEFAULT NULL::text,
  p_home_size text DEFAULT NULL::text,
  p_additional_services_cost numeric DEFAULT 0
)
RETURNS TABLE(
  fixed_fee numeric, 
  commission_percent numeric, 
  commission_amount numeric, 
  admin_total_revenue numeric, 
  nanny_earnings numeric,
  bonus_contribution numeric
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
  v_bonus_contribution DECIMAL := 0;
  v_home_size_formatted TEXT;
BEGIN
  -- Format home size key
  v_home_size_formatted := LOWER(REPLACE(COALESCE(p_home_size, ''), ' ', '_'));

  IF p_booking_type = 'long_term' THEN
    -- Long Term Logic
    
    -- 1. Placement Fee
    IF v_home_size_formatted IN ('grand_estate', 'monumental_manor', 'epic_estates', 'grand_retreat') THEN
       v_fixed_fee := ROUND(p_client_total * 0.50, 2);
    ELSE
       v_fixed_fee := 2500.00;
    END IF;

    -- 2. Commission
    IF p_client_total >= 10000 THEN
      v_commission_percent := 30;
    ELSIF p_client_total >= 7000 THEN
      v_commission_percent := 25;
    ELSIF p_client_total > 5000 THEN
      v_commission_percent := 15;
    ELSE
      v_commission_percent := 10;
    END IF;
    
    v_commission_amount := ROUND(p_client_total * (v_commission_percent / 100.0), 2);
    
    -- 3. Annual Bonus Contribution (5% of Monthly Rate)
    -- "Client contribution (5% of Nanny's monthly income) towards a bonus pot."
    -- We assume calculated on the Base+Adds (p_client_total).
    v_bonus_contribution := ROUND(p_client_total * 0.05, 2);
    
    -- Revenue Aggregation
    v_admin_total_revenue := v_commission_amount;
    v_nanny_earnings := p_client_total - v_commission_amount;
    
  ELSE
    -- Short Term Logic
    IF p_booking_type = 'temporary_support' THEN
       v_fixed_fee := 2500.00;
    ELSE
       v_fixed_fee := 35.00;
    END IF;
    
    v_commission_percent := 20;
    
    DECLARE
      v_commissionable_amount DECIMAL;
    BEGIN
      v_commissionable_amount := p_client_total - v_fixed_fee;
      IF v_commissionable_amount < 0 THEN v_commissionable_amount := 0; END IF;
      
      v_commission_amount := ROUND(v_commissionable_amount * 0.20, 2);
      
      v_admin_total_revenue := v_fixed_fee + v_commission_amount;
      v_nanny_earnings := v_commissionable_amount - v_commission_amount;
      v_bonus_contribution := 0; -- No bonus for short term? Assumed.
    END;
    
  END IF;

  RETURN QUERY SELECT v_fixed_fee, v_commission_percent, v_commission_amount, v_admin_total_revenue, v_nanny_earnings, v_bonus_contribution;
END;
$function$;
