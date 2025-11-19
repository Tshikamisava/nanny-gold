-- Fix commission tier calculation in calculate_booking_revenue function
-- This corrects the tiers to match the business requirements:
-- Long-term: ≤R5k=10%, R5,001-R9,999=15%, ≥R10k=25%
-- Short-term: Flat 20%

CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_type text, 
  p_home_size text, 
  p_client_total numeric, 
  p_additional_services_cost numeric DEFAULT 0
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
  v_commission_percent numeric := 0;
  v_commission_amount numeric := 0;
  v_nanny_earnings numeric := 0;
  v_admin_revenue numeric := 0;
BEGIN
  -- Calculate placement fee for long-term bookings
  IF p_booking_type = 'long_term' THEN
    CASE LOWER(p_home_size)
      WHEN 'pocket_palace', 'family_hub' THEN 
        v_placement_fee := 2500;
      WHEN 'grand_estate', 'grand_retreat' THEN 
        v_placement_fee := 2500; -- Flat R2,500 for Grand Estate
      WHEN 'monumental_manor', 'epic_estates' THEN 
        -- For premium estates, calculate 50% of total
        v_placement_fee := ROUND(p_client_total * 0.50, 2);
      ELSE 
        v_placement_fee := 2500;
    END CASE;
    
    -- CORRECTED: Commission tiers based on TOTAL amount (p_client_total)
    -- Budget Tier (≤R5,000): 10%
    -- Standard Tier (R5,001-R9,999): 15%
    -- Premium Tier (≥R10,000): 25%
    IF p_client_total >= 10000 THEN
      v_commission_percent := 25;
    ELSIF p_client_total >= 5001 THEN
      v_commission_percent := 15;
    ELSE
      v_commission_percent := 10;
    END IF;
    
    -- Calculate commission on TOTAL amount
    v_commission_amount := ROUND(p_client_total * v_commission_percent / 100, 2);
    
    -- Nanny earnings: total amount minus commission
    v_nanny_earnings := p_client_total - v_commission_amount;
    
    -- Admin revenue: placement fee + monthly commission
    v_admin_revenue := v_placement_fee + v_commission_amount;
    
  ELSE
    -- Short-term bookings: R35 flat fee + 20% commission
    v_placement_fee := 35;
    v_commission_percent := 20;
    v_commission_amount := ROUND(p_client_total * 0.20, 2);
    v_nanny_earnings := p_client_total - 35 - v_commission_amount;
    v_admin_revenue := 35 + v_commission_amount;
  END IF;
  
  RETURN QUERY SELECT 
    v_placement_fee,
    v_commission_percent,
    v_commission_amount,
    v_nanny_earnings,
    v_admin_revenue;
END;
$function$;

-- Recalculate all existing booking_financials records
UPDATE public.booking_financials bf
SET 
  fixed_fee = revenue.fixed_fee,
  commission_percent = revenue.commission_percent,
  commission_amount = revenue.commission_amount,
  nanny_earnings = revenue.nanny_earnings,
  admin_total_revenue = revenue.admin_total_revenue,
  commission_source = 'corrected_tiers',
  calculated_at = now(),
  updated_at = now()
FROM public.bookings b
CROSS JOIN LATERAL (
  SELECT * FROM public.calculate_booking_revenue(
    b.booking_type,
    b.home_size,
    b.total_monthly_cost,
    COALESCE(b.additional_services_cost, 0)
  )
) AS revenue
WHERE bf.booking_id = b.id;