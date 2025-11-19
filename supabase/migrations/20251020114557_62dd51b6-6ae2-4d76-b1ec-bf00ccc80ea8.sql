-- Fix Grand Estate placement fee to be flat R2,500 instead of 50%
-- This ensures Grand Estate is charged the same as Pocket Palace/Family Hub

CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_type text,
  p_home_size text,
  p_client_total numeric,
  p_additional_services_cost numeric DEFAULT 0
)
RETURNS TABLE (
  fixed_fee numeric,
  commission_percent numeric,
  commission_amount numeric,
  nanny_earnings numeric,
  admin_total_revenue numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_placement_fee numeric := 0;
  v_commission_percent numeric := 0;
  v_commission_amount numeric := 0;
  v_monthly_rate numeric := 0;
  v_nanny_earnings numeric := 0;
  v_admin_revenue numeric := 0;
BEGIN
  -- Calculate placement fee for long-term bookings
  IF p_booking_type = 'long_term' THEN
    CASE LOWER(p_home_size)
      WHEN 'pocket_palace', 'family_hub' THEN 
        v_placement_fee := 2500;
      WHEN 'grand_estate' THEN 
        v_placement_fee := 2500; -- FIXED: Flat R2,500 (was 50% = R4,000)
      WHEN 'monumental_manor', 'epic_estates' THEN 
        v_monthly_rate := p_client_total - p_additional_services_cost;
        v_placement_fee := ROUND(v_monthly_rate * 0.50, 2); -- Keep 50% for premium estates
      ELSE 
        v_placement_fee := 2500;
    END CASE;
    
    -- Calculate monthly rate (base rate without additional services)
    v_monthly_rate := p_client_total - p_additional_services_cost;
    
    -- Sliding scale commission on base rate only
    IF v_monthly_rate >= 18000 THEN
      v_commission_percent := 25;
    ELSIF v_monthly_rate >= 12001 THEN
      v_commission_percent := 20;
    ELSIF v_monthly_rate >= 8000 THEN
      v_commission_percent := 15;
    ELSE
      v_commission_percent := 10;
    END IF;
    
    v_commission_amount := ROUND(v_monthly_rate * v_commission_percent / 100, 2);
    
    -- Nanny earnings: (base rate - commission) + 100% of additional services
    v_nanny_earnings := (v_monthly_rate - v_commission_amount) + p_additional_services_cost;
    
    -- Admin revenue: placement fee + monthly commission
    v_admin_revenue := v_placement_fee + v_commission_amount;
    
  ELSE
    -- Short-term bookings: R35 flat fee
    v_placement_fee := 35;
    v_commission_percent := 0;
    v_commission_amount := 0;
    v_nanny_earnings := p_client_total - 35;
    v_admin_revenue := 35;
  END IF;
  
  RETURN QUERY SELECT 
    v_placement_fee,
    v_commission_percent,
    v_commission_amount,
    v_nanny_earnings,
    v_admin_revenue;
END;
$$;