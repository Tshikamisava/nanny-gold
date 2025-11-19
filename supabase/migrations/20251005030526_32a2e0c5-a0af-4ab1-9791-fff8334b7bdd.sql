-- Step 1: Drop trigger and trigger function
DROP TRIGGER IF EXISTS ensure_booking_financials_trigger ON public.bookings;
DROP FUNCTION IF EXISTS public.ensure_booking_financials();

-- Step 2: Use DO block to drop all overloads of calculate_booking_revenue
DO $$ 
DECLARE
  func_sig TEXT;
BEGIN
  FOR func_sig IN 
    SELECT 'DROP FUNCTION IF EXISTS public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE'
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'calculate_booking_revenue'
  LOOP
    EXECUTE func_sig;
  END LOOP;
END $$;

-- Step 3: Add unique constraint on booking_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'booking_financials_booking_id_key'
  ) THEN
    ALTER TABLE public.booking_financials 
    ADD CONSTRAINT booking_financials_booking_id_key UNIQUE (booking_id);
  END IF;
END $$;

-- Step 4: Create the single new version with database enum values
CREATE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid,
  p_client_total numeric,
  p_booking_type text,
  p_living_arrangement text DEFAULT NULL,
  p_home_size text DEFAULT NULL,
  p_additional_services_cost numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_commission_percent NUMERIC := 20.0;
  v_placement_fee NUMERIC := 0;
  v_monthly_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_nanny_earnings NUMERIC;
  v_admin_total_revenue NUMERIC;
BEGIN
  IF p_booking_type = 'long_term' THEN
    CASE LOWER(p_home_size)
      WHEN 'pocket_palace', 'family_hub' THEN 
        v_placement_fee := 2500;
      WHEN 'grand_estate', 'monumental_manor' THEN 
        v_monthly_rate := p_client_total - p_additional_services_cost;
        v_placement_fee := ROUND(v_monthly_rate * 0.50, 2);
      ELSE 
        v_placement_fee := 2500;
    END CASE;
    
    v_monthly_rate := p_client_total - v_placement_fee - p_additional_services_cost;
    
    IF v_monthly_rate < 8000 THEN
      v_commission_percent := 10.0;
    ELSIF v_monthly_rate BETWEEN 8000 AND 12000 THEN
      v_commission_percent := 15.0;
    ELSIF v_monthly_rate BETWEEN 12001 AND 18000 THEN
      v_commission_percent := 20.0;
    ELSE
      v_commission_percent := 25.0;
    END IF;
  ELSE
    v_monthly_rate := p_client_total - p_additional_services_cost;
  END IF;

  v_commission_amount := ROUND(v_monthly_rate * v_commission_percent / 100, 2);
  v_nanny_earnings := ROUND(v_monthly_rate - v_commission_amount + p_additional_services_cost, 2);
  v_admin_total_revenue := ROUND(v_placement_fee + v_commission_amount, 2);

  RETURN jsonb_build_object(
    'placement_fee', v_placement_fee,
    'commission_percent', v_commission_percent,
    'commission_amount', v_commission_amount,
    'nanny_earnings', v_nanny_earnings,
    'admin_total_revenue', v_admin_total_revenue,
    'monthly_rate', v_monthly_rate
  );
END;
$function$;

-- Step 5: Recreate trigger function with correct upsert
CREATE FUNCTION public.ensure_booking_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_financials JSONB;
BEGIN
  v_financials := public.calculate_booking_revenue(
    NEW.id,
    NEW.total_monthly_cost,
    NEW.booking_type,
    NEW.living_arrangement::TEXT,
    NEW.home_size,
    COALESCE(NEW.additional_services_cost, 0)
  );
  
  INSERT INTO public.booking_financials (
    booking_id,
    booking_type,
    fixed_fee,
    commission_percent,
    commission_amount,
    nanny_earnings,
    admin_total_revenue
  ) VALUES (
    NEW.id,
    NEW.booking_type,
    (v_financials->>'placement_fee')::NUMERIC,
    (v_financials->>'commission_percent')::NUMERIC,
    (v_financials->>'commission_amount')::NUMERIC,
    (v_financials->>'nanny_earnings')::NUMERIC,
    (v_financials->>'admin_total_revenue')::NUMERIC
  )
  ON CONFLICT (booking_id) 
  DO UPDATE SET
    fixed_fee = EXCLUDED.fixed_fee,
    commission_percent = EXCLUDED.commission_percent,
    commission_amount = EXCLUDED.commission_amount,
    nanny_earnings = EXCLUDED.nanny_earnings,
    admin_total_revenue = EXCLUDED.admin_total_revenue,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$;

-- Step 6: Recreate trigger
CREATE TRIGGER ensure_booking_financials_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_booking_financials();

-- Step 7: Migrate existing home_size data in clients table
UPDATE clients 
SET home_size = CASE 
  WHEN LOWER(home_size) IN ('small', 'pocket palace') OR home_size ILIKE '%pocket%palace%' THEN 'pocket_palace'
  WHEN LOWER(home_size) IN ('medium', 'family hub') OR home_size ILIKE '%family%hub%' THEN 'family_hub'
  WHEN LOWER(home_size) IN ('large', 'grand retreat', 'grand estate') OR home_size ILIKE '%grand%' THEN 'grand_estate'
  WHEN LOWER(home_size) IN ('monumental', 'epic estates', 'monumental manor') OR home_size ILIKE '%manor%' OR home_size ILIKE '%epic%' THEN 'monumental_manor'
  ELSE 'family_hub'
END
WHERE home_size IS NULL 
   OR LOWER(home_size) NOT IN ('pocket_palace', 'family_hub', 'grand_estate', 'monumental_manor');

-- Step 8: Migrate existing home_size data in bookings table
UPDATE bookings
SET home_size = CASE 
  WHEN LOWER(home_size) IN ('small', 'pocket palace') OR home_size ILIKE '%pocket%palace%' THEN 'pocket_palace'
  WHEN LOWER(home_size) IN ('medium', 'family hub') OR home_size ILIKE '%family%hub%' THEN 'family_hub'
  WHEN LOWER(home_size) IN ('large', 'grand retreat', 'grand estate') OR home_size ILIKE '%grand%' THEN 'grand_estate'
  WHEN LOWER(home_size) IN ('monumental', 'epic estates', 'monumental manor') OR home_size ILIKE '%manor%' OR home_size ILIKE '%epic%' THEN 'monumental_manor'
  ELSE 'family_hub'
END
WHERE home_size IS NULL 
   OR LOWER(home_size) NOT IN ('pocket_palace', 'family_hub', 'grand_estate', 'monumental_manor');