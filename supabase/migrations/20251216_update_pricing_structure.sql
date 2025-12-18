-- Update pricing structure according to new business logic
-- Short-term: 20% commission on (total - service fee)
-- Long-term: Updated commission tiers (5%, 20%, 30%) and placement fees

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
    -- Updated placement fee calculation based on home size
    IF p_home_size IN ('grand_estate', 'monumental_manor', 'epic_estates') THEN
      -- Premium homes: 50% of monthly rate as placement fee
      v_fixed_fee := v_monthly_rate * 0.50;
    ELSE
      -- Standard homes (Pocket Palace, Family Hub): Fixed R2,500 placement fee
      v_fixed_fee := 2500.00;
    END IF;

    -- Updated commission calculation with new tiers
    IF v_monthly_rate >= 10000 THEN
      v_commission_percent := 30; -- Premium tier: 30%
    ELSIF v_monthly_rate <= 5000 THEN
      v_commission_percent := 5;  -- Budget tier: 5%
    ELSE
      v_commission_percent := 20; -- Standard tier: 20%
    END IF;

    -- Commission is calculated on the full monthly rate
    v_commission_amount := v_monthly_rate * (v_commission_percent / 100);

    -- Admin total revenue = placement fee + commission
    v_admin_total_revenue := v_fixed_fee + v_commission_amount;

    -- Nanny earnings = monthly rate minus commission (placement fee doesn't affect nanny)
    v_nanny_earnings := v_monthly_rate - v_commission_amount;

  ELSE
    -- Short-term bookings: R35 service fee per booking
    -- For short-term, we need to determine if it's a single day or multi-day
    DECLARE
      booking_days INTEGER := 1;
      service_fee_per_day DECIMAL := 35.00;
    BEGIN
      -- Try to get actual booking days, fallback to 1
      SELECT COALESCE(
        GREATEST(1, DATE_PART('day', b.end_date - b.start_date) + 1)::INTEGER,
        1
      ) INTO booking_days
      FROM public.bookings b
      WHERE b.id = p_booking_id;

      -- Service fee is R35 per booking (not per day for multi-day bookings)
      -- But for gap coverage (temporary_support), service fee is waived
      DECLARE
        booking_subtype TEXT;
      BEGIN
        SELECT COALESCE(b.booking_sub_type, 'standard') INTO booking_subtype
        FROM public.bookings b
        WHERE b.id = p_booking_id;

        IF booking_subtype = 'temporary_support' THEN
          -- Gap Coverage: Service fee waived
          v_fixed_fee := 0;
        ELSE
          -- Other short-term: R35 service fee
          v_fixed_fee := service_fee_per_day;
        END IF;
      END;

      v_commission_percent := 20; -- Flat 20% for short-term

      -- Commission on the total amount minus service fee
      v_commission_amount := (p_total_amount - v_fixed_fee) * (v_commission_percent / 100);
      v_admin_total_revenue := v_fixed_fee + v_commission_amount;

      -- Nanny earnings = total - service fee - commission
      v_nanny_earnings := p_total_amount - v_fixed_fee - v_commission_amount;
    END;
  END IF;

  RETURN QUERY SELECT v_fixed_fee, v_commission_percent, v_commission_amount, v_admin_total_revenue, v_nanny_earnings;
END;
$function$;

-- Update comment
COMMENT ON FUNCTION public.calculate_booking_revenue IS
'Calculates revenue split for bookings.
Long-term: placement fee (R2,500 or 50% for premium) + tiered commission (5-30%)
Short-term: R35 service fee (waived for gap coverage) + 20% commission
Nanny earnings = total - fixed_fee - commission_amount';</content>
<parameter name="filePath">c:\Users\Mzwandie\Videos\nanny-gold\supabase\migrations\20251216_update_pricing_structure.sql