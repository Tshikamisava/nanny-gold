-- Step 1: Clean up duplicate bookings before adding constraint
-- Keep the oldest booking and mark duplicates as 'cancelled'
WITH duplicates AS (
  SELECT 
    id,
    client_id,
    nanny_id,
    start_date,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, nanny_id, start_date, status
      ORDER BY created_at ASC
    ) as rn
  FROM public.bookings
  WHERE status IN ('pending', 'confirmed', 'active')
)
UPDATE public.bookings
SET 
  status = 'cancelled',
  notes = COALESCE(notes || ' | ', '') || 'Auto-cancelled: Duplicate booking detected during system cleanup'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Log how many duplicates were found
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM public.bookings
  WHERE notes LIKE '%Auto-cancelled: Duplicate booking detected%';
  
  RAISE NOTICE 'Cleaned up % duplicate booking(s)', duplicate_count;
END $$;

-- Step 2: Drop the existing function first
DROP FUNCTION IF EXISTS public.calculate_booking_revenue(uuid, numeric, text, text, text, numeric, numeric);

-- Step 3: Create updated function with correct placement fees and sliding scale commission
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid,
  p_client_total numeric,
  p_booking_type text,
  p_living_arrangement text DEFAULT NULL,
  p_home_size text DEFAULT NULL,
  p_additional_services_cost numeric DEFAULT 0,
  p_booking_days numeric DEFAULT 1
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
AS $$
DECLARE
  v_placement_fee NUMERIC := 0;
  v_monthly_rate NUMERIC;
  v_commission_percent NUMERIC := 20.0;
  v_commission_amount NUMERIC;
  v_nanny_earnings NUMERIC;
  v_admin_total_revenue NUMERIC;
BEGIN
  -- ✅ P2: Handle NULL home_size with warning
  IF p_home_size IS NULL AND p_booking_type = 'long_term' THEN
    RAISE WARNING 'home_size is NULL for booking %. Using default placement fee of R2500.', p_booking_id;
    v_placement_fee := 2500;
  END IF;

  -- ✅ P2: Calculate placement fee for long-term bookings (R2500 or 50%)
  IF p_booking_type = 'long_term' AND p_home_size IS NOT NULL THEN
    CASE p_home_size
      WHEN 'small', 'medium' THEN 
        -- Pocket Palace, Family Hub: R2500 flat fee
        v_placement_fee := 2500;
      WHEN 'large', 'monumental' THEN
        -- Grand Retreat, Epic Estates: 50% of monthly base rate or R2500, whichever is higher
        -- Calculate monthly rate first
        v_monthly_rate := p_client_total - p_additional_services_cost;
        v_placement_fee := GREATEST(2500, v_monthly_rate * 0.50);
      ELSE
        -- Fallback for unexpected values
        v_placement_fee := 2500;
    END CASE;
  ELSE
    -- Short-term bookings have no placement fee
    v_placement_fee := 0;
  END IF;

  -- Calculate monthly rate (excluding placement fee and additional services)
  v_monthly_rate := p_client_total - v_placement_fee - p_additional_services_cost;

  -- ✅ P2: Sliding scale commission based on booking type
  v_commission_percent := CASE
    WHEN p_booking_type = 'long_term' THEN
      -- Sliding scale for long-term bookings
      CASE
        WHEN v_monthly_rate < 5000 THEN 25.0
        WHEN v_monthly_rate >= 5000 AND v_monthly_rate < 8000 THEN 20.0
        WHEN v_monthly_rate >= 8000 AND v_monthly_rate < 10000 THEN 15.0
        WHEN v_monthly_rate >= 10000 THEN 10.0
        ELSE 20.0 -- Default fallback
      END
    WHEN p_booking_type IN ('short_term', 'date_night', 'date_day', 'school_holiday', 'emergency') THEN
      -- Flat 20% for all short-term bookings
      20.0
    ELSE
      -- Default to 20% for any other booking type
      20.0
  END;

  -- Calculate commission ONLY on monthly rate (not on placement fee or additional services)
  v_commission_amount := ROUND(v_monthly_rate * v_commission_percent / 100, 2);

  -- Calculate nanny earnings: monthly rate - commission + additional services
  v_nanny_earnings := ROUND(v_monthly_rate - v_commission_amount + p_additional_services_cost, 2);

  -- Admin total revenue: placement fee + commission
  v_admin_total_revenue := ROUND(v_placement_fee + v_commission_amount, 2);

  -- Return the calculated values
  RETURN QUERY SELECT 
    v_placement_fee as fixed_fee,
    v_commission_percent as commission_percent,
    v_commission_amount as commission_amount,
    v_admin_total_revenue as admin_total_revenue,
    v_nanny_earnings as nanny_earnings;
END;
$$;

-- Step 4: Add unique constraint to prevent duplicate bookings
DROP INDEX IF EXISTS public.idx_unique_active_booking;

CREATE UNIQUE INDEX idx_unique_active_booking 
ON public.bookings (client_id, nanny_id, start_date, status)
WHERE status IN ('pending', 'confirmed', 'active');

COMMENT ON INDEX public.idx_unique_active_booking IS 
'Prevents duplicate bookings for the same client-nanny combination on the same start date when booking is active, pending, or confirmed.';

-- Step 5: Backfill existing booking financials with correct calculations
DO $$
DECLARE
  booking_record RECORD;
  revenue_data RECORD;
  backfill_count INTEGER := 0;
BEGIN
  FOR booking_record IN 
    SELECT 
      b.id,
      b.total_monthly_cost,
      b.booking_type,
      b.living_arrangement,
      b.home_size,
      b.additional_services_cost,
      CASE 
        WHEN b.end_date IS NOT NULL THEN 
          GREATEST(1, (b.end_date::date - b.start_date::date) + 1)
        ELSE 1
      END as booking_days
    FROM public.bookings b
    WHERE EXISTS (
      SELECT 1 FROM public.booking_financials bf WHERE bf.booking_id = b.id
    )
    AND b.status NOT IN ('cancelled')
  LOOP
    SELECT * INTO revenue_data
    FROM public.calculate_booking_revenue(
      booking_record.id,
      booking_record.total_monthly_cost,
      booking_record.booking_type,
      booking_record.living_arrangement::text,
      booking_record.home_size,
      COALESCE(booking_record.additional_services_cost, 0),
      booking_record.booking_days
    );

    UPDATE public.booking_financials
    SET 
      fixed_fee = revenue_data.fixed_fee,
      commission_percent = revenue_data.commission_percent,
      commission_amount = revenue_data.commission_amount,
      admin_total_revenue = revenue_data.admin_total_revenue,
      nanny_earnings = revenue_data.nanny_earnings,
      commission_source = CASE 
        WHEN booking_record.booking_type = 'long_term' THEN 'sliding_scale'
        ELSE 'flat_rate'
      END,
      updated_at = now()
    WHERE booking_id = booking_record.id;
    
    backfill_count := backfill_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % booking(s) with correct financials', backfill_count;
END $$;