-- Phase 1: Fix Financial Calculations
-- Update calculate_booking_revenue function to properly calculate nanny earnings
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id UUID,
  p_client_total NUMERIC,
  p_booking_type TEXT,
  p_living_arrangement TEXT DEFAULT NULL,
  p_home_size TEXT DEFAULT NULL,
  p_additional_services_cost NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_percent NUMERIC := 20.0; -- Standard 20% commission
  v_placement_fee NUMERIC := 0;
  v_monthly_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_nanny_earnings NUMERIC;
  v_admin_total_revenue NUMERIC;
BEGIN
  -- Calculate placement fee for long-term bookings
  IF p_booking_type = 'long_term' THEN
    -- Placement fee calculation based on home size
    CASE p_home_size
      WHEN '1-2 bedroom' THEN v_placement_fee := 1000;
      WHEN '3 bedroom' THEN v_placement_fee := 1200;
      WHEN '4+ bedroom' THEN v_placement_fee := 1500;
      WHEN 'townhouse' THEN v_placement_fee := 1200;
      WHEN 'estate' THEN v_placement_fee := 2000;
      ELSE v_placement_fee := 1000;
    END CASE;
  END IF;

  -- Calculate monthly rate (excluding placement fee and additional services)
  v_monthly_rate := p_client_total - v_placement_fee - p_additional_services_cost;

  -- Calculate commission ONLY on monthly rate
  v_commission_amount := ROUND(v_monthly_rate * v_commission_percent / 100, 2);

  -- Calculate nanny earnings: monthly rate - commission + additional services
  v_nanny_earnings := ROUND(v_monthly_rate - v_commission_amount + p_additional_services_cost, 2);

  -- Calculate admin total revenue: commission + placement fee
  v_admin_total_revenue := ROUND(v_commission_amount + v_placement_fee, 2);

  -- Return detailed breakdown
  RETURN jsonb_build_object(
    'commission_percent', v_commission_percent,
    'commission_amount', v_commission_amount,
    'commission_source', 'monthly_rate_only',
    'fixed_fee', v_placement_fee,
    'nanny_earnings', v_nanny_earnings,
    'admin_total_revenue', v_admin_total_revenue,
    'monthly_rate', v_monthly_rate,
    'additional_services_cost', p_additional_services_cost
  );
END;
$$;

-- Ensure booking_financials are created for all bookings
CREATE OR REPLACE FUNCTION public.ensure_booking_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_financials JSONB;
BEGIN
  -- Only create financials for confirmed or active bookings
  IF NEW.status IN ('confirmed', 'active') THEN
    -- Calculate financials
    v_financials := public.calculate_booking_revenue(
      NEW.id,
      NEW.total_monthly_cost,
      NEW.booking_type,
      NEW.living_arrangement::TEXT,
      NEW.home_size,
      COALESCE(NEW.additional_services_cost, 0)
    );

    -- Insert or update booking_financials
    INSERT INTO public.booking_financials (
      booking_id,
      booking_type,
      commission_percent,
      commission_amount,
      commission_source,
      fixed_fee,
      nanny_earnings,
      admin_total_revenue
    ) VALUES (
      NEW.id,
      NEW.booking_type,
      (v_financials->>'commission_percent')::NUMERIC,
      (v_financials->>'commission_amount')::NUMERIC,
      v_financials->>'commission_source',
      (v_financials->>'fixed_fee')::NUMERIC,
      (v_financials->>'nanny_earnings')::NUMERIC,
      (v_financials->>'admin_total_revenue')::NUMERIC
    )
    ON CONFLICT (booking_id) DO UPDATE SET
      commission_percent = EXCLUDED.commission_percent,
      commission_amount = EXCLUDED.commission_amount,
      commission_source = EXCLUDED.commission_source,
      fixed_fee = EXCLUDED.fixed_fee,
      nanny_earnings = EXCLUDED.nanny_earnings,
      admin_total_revenue = EXCLUDED.admin_total_revenue,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to ensure financials on booking insert/update
DROP TRIGGER IF EXISTS ensure_booking_financials_trigger ON public.bookings;
CREATE TRIGGER ensure_booking_financials_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_booking_financials();

-- Backfill financials for existing bookings without them
DO $$
DECLARE
  booking_record RECORD;
  v_financials JSONB;
BEGIN
  FOR booking_record IN 
    SELECT b.* 
    FROM public.bookings b
    LEFT JOIN public.booking_financials bf ON b.id = bf.booking_id
    WHERE bf.id IS NULL 
    AND b.status IN ('confirmed', 'active', 'pending', 'completed')
  LOOP
    -- Calculate financials
    v_financials := public.calculate_booking_revenue(
      booking_record.id,
      booking_record.total_monthly_cost,
      booking_record.booking_type,
      booking_record.living_arrangement::TEXT,
      booking_record.home_size,
      COALESCE(booking_record.additional_services_cost, 0)
    );

    -- Insert booking_financials
    INSERT INTO public.booking_financials (
      booking_id,
      booking_type,
      commission_percent,
      commission_amount,
      commission_source,
      fixed_fee,
      nanny_earnings,
      admin_total_revenue
    ) VALUES (
      booking_record.id,
      booking_record.booking_type,
      (v_financials->>'commission_percent')::NUMERIC,
      (v_financials->>'commission_amount')::NUMERIC,
      v_financials->>'commission_source',
      (v_financials->>'fixed_fee')::NUMERIC,
      (v_financials->>'nanny_earnings')::NUMERIC,
      (v_financials->>'admin_total_revenue')::NUMERIC
    );
  END LOOP;
END $$;