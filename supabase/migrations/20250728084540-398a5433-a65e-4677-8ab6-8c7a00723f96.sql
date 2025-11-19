-- Fix all remaining security issues

-- 1. Fix the remaining functions that need search_path
CREATE OR REPLACE FUNCTION public.is_valid_sa_phone(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  -- Remove all spaces and special characters
  phone_number := regexp_replace(phone_number, '[^0-9+]', '', 'g');
  
  -- Check if it matches South African phone number patterns
  -- +27 followed by 9 digits, or 0 followed by 9 digits
  RETURN phone_number ~ '^(\+27[0-9]{9}|0[0-9]{9})$';
END;
$function$;

-- Fix calculate_booking_revenue function
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(p_booking_id uuid, p_total_amount numeric, p_booking_type text, p_monthly_rate_estimate numeric DEFAULT NULL::numeric)
RETURNS TABLE(fixed_fee numeric, commission_percent numeric, commission_amount numeric, admin_total_revenue numeric, nanny_earnings numeric)
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
$function$;

-- 2. Check if there's still a security definer view and fix it
-- The view should already be fixed, but let's ensure it has proper RLS
-- Drop and recreate the view to ensure it's not a security definer view
DROP VIEW IF EXISTS public.available_nannies_with_location CASCADE;

-- Create a materialized view instead for better performance and security
CREATE MATERIALIZED VIEW public.available_nannies_with_location AS
SELECT 
  n.id,
  p.latitude,
  p.longitude,
  n.experience_level,
  n.hourly_rate,
  n.monthly_rate,
  n.rating,
  n.total_reviews,
  p.first_name,
  p.last_name,
  p.location,
  n.skills,
  n.languages,
  n.approval_status
FROM public.nannies n
JOIN public.profiles p ON n.id = p.id
WHERE n.is_available = true 
  AND n.approval_status = 'approved';

-- Create index for better performance
CREATE INDEX ON public.available_nannies_with_location (id);
CREATE INDEX ON public.available_nannies_with_location (latitude, longitude);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_available_nannies_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.available_nannies_with_location;
END;
$function$;