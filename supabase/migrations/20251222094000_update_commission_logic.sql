-- Migration: Update Commission Logic
-- Description: Updates calculate_booking_revenue function to support new commission tiers and short term logic.

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
  v_monthly_base_rate DECIMAL := 0;
  v_home_size_formatted TEXT;
BEGIN
  -- Format home size key for comparison if needed
  v_home_size_formatted := LOWER(REPLACE(COALESCE(p_home_size, ''), ' ', '_'));

  IF p_booking_type = 'long_term' THEN
    -- Long Term Logic
    
    -- 1. Placement Fee (Service Fee)
    -- Standard Homes (Pocket Palace, Family Hub): R2,500 fixed
    -- Premium Homes (Grand Estate, Monumental Manor, Epic Estates): 50% of monthly rate
    -- We need to know if it's premium.
    
    -- Assuming p_client_total is the Total Monthly Cost (Base + Addons).
    -- Wait, placement fee for premium is 50% of "monthly rate". 
    -- Does that mean Base Rate or Total? 
    -- Requirement: "Premium Homes ... 50% of monthly rate"
    -- Usually implies Base Rate, but let's assume Total to be safe for revenue, or derive base?
    -- Actually, simpler: The requirement says:
    -- "The monthly booking rate must then be reserved... commission is on total amount?? No."
    -- "Admin Commission: ... Nanny Earnings: Monthly rate minus commission"
    -- "Placement fee does NOT affect nanny earnings"
    
    -- Let's stick to the prompt's Placement Fee logic:
    -- Standard: R2,500
    -- Premium: 50% of monthly rate.
    
    IF v_home_size_formatted IN ('grand_estate', 'monumental_manor', 'epic_estates', 'grand_retreat') THEN
       v_fixed_fee := ROUND(p_client_total * 0.50, 2);
    ELSE
       v_fixed_fee := 2500.00;
    END IF;

    -- 2. Commission Structure (Monthly Recurring)
    -- Budget Tier (<= R5,000): 10%
    -- Standard Tier (R5,001 - R6,999): 15%
    -- Standard+ Tier (R7,000 - R9,999): 25%
    -- Premium Tier (>= R10,000): 30%
    
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
    
    -- Admin Revenue = Placement Fee (One-time, handled separately usually) + Monthly Commission
    -- BUT, this function calculates revenue distribution for a given transaction/booking period.
    -- If this is the FIRST month, Admin gets Placement + Commission?
    -- If recurring, Admin gets Commission?
    -- The function doesn't know if it's first month. 
    -- However, "Placement fee must be shown as due and be deducted... The monthly booking rate must then be reserved..."
    -- This suggests Placement Fee is separate transaction or on top.
    -- For this calculation, let's assume we return the breakdown of "Earnings per Month" and "Fixed Fee (One Off)".
    
    v_admin_total_revenue := v_commission_amount; -- Monthly revenue
    -- We return fixed_fee so the caller knows what the one-off is.
    
    -- Nanny Earnings = Monthly Rate - Commission
    v_nanny_earnings := p_client_total - v_commission_amount;
    
  ELSE
    -- Short Term Logic
    -- 1. Service Fee
    -- Emergency/DateNight/DayCare: R35.00
    -- Gap Coverage: R2500 (Placement)?? Or R35?
    -- Prompt: "Gap Coverage ... Service Fee: R2500 placement"
    
    IF p_booking_type = 'temporary_support' THEN
       v_fixed_fee := 2500.00;
    ELSE
       v_fixed_fee := 35.00;
       -- Unless it's "Bespoke"? Assumed standard.
    END IF;
    
    -- 2. Commission
    -- "Admin Commission: 20% on (total amount - service fee)"
    -- "Nanny Earnings: 80% of total amount (after service fee)"
    
    v_commission_percent := 20;
    
    -- Calculate commissionable amount
    DECLARE
      v_commissionable_amount DECIMAL;
    BEGIN
      v_commissionable_amount := p_client_total - v_fixed_fee;
      
      -- Safety check
      IF v_commissionable_amount < 0 THEN
         v_commissionable_amount := 0;
      END IF;
      
      v_commission_amount := ROUND(v_commissionable_amount * 0.20, 2);
      
      v_admin_total_revenue := v_fixed_fee + v_commission_amount;
      v_nanny_earnings := v_commissionable_amount - v_commission_amount;
    END;
    
  END IF;

  RETURN QUERY SELECT v_fixed_fee, v_commission_percent, v_commission_amount, v_admin_total_revenue, v_nanny_earnings;
END;
$function$;
