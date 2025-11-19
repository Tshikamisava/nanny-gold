-- Phase 1: Create function to populate missing booking financials
CREATE OR REPLACE FUNCTION public.populate_missing_booking_financials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  booking_record RECORD;
  revenue_data RECORD;
BEGIN
  -- Loop through confirmed bookings that don't have financial records
  FOR booking_record IN 
    SELECT b.id, b.total_monthly_cost, b.booking_type, b.monthly_rate_estimate, b.booking_days
    FROM public.bookings b
    LEFT JOIN public.booking_financials bf ON bf.booking_id = b.id
    WHERE b.status = 'confirmed' AND bf.id IS NULL
  LOOP
    -- Calculate revenue breakdown for this booking
    SELECT * INTO revenue_data 
    FROM public.calculate_booking_revenue(
      booking_record.id,
      COALESCE(booking_record.total_monthly_cost, booking_record.monthly_rate_estimate, 0),
      booking_record.booking_type,
      booking_record.monthly_rate_estimate,
      COALESCE(booking_record.booking_days, 1)
    );
    
    -- Insert financial record
    INSERT INTO public.booking_financials (
      booking_id,
      total_amount,
      admin_revenue,
      nanny_earnings,
      commission_rate,
      fixed_fee,
      commission_amount
    ) VALUES (
      booking_record.id,
      COALESCE(booking_record.total_monthly_cost, booking_record.monthly_rate_estimate, 0),
      revenue_data.admin_total_revenue,
      revenue_data.nanny_earnings,
      revenue_data.commission_percent,
      revenue_data.fixed_fee,
      revenue_data.commission_amount
    );
  END LOOP;
END;
$$;

-- Phase 2: Create trigger to automatically create financial records
CREATE OR REPLACE FUNCTION public.auto_create_booking_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  revenue_data RECORD;
BEGIN
  -- Only create financial records for confirmed bookings
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    -- Check if financial record already exists
    IF NOT EXISTS (SELECT 1 FROM public.booking_financials WHERE booking_id = NEW.id) THEN
      -- Calculate revenue breakdown
      SELECT * INTO revenue_data 
      FROM public.calculate_booking_revenue(
        NEW.id,
        COALESCE(NEW.total_monthly_cost, NEW.monthly_rate_estimate, 0),
        NEW.booking_type,
        NEW.monthly_rate_estimate,
        COALESCE(NEW.booking_days, 1)
      );
      
      -- Insert financial record
      INSERT INTO public.booking_financials (
        booking_id,
        total_amount,
        admin_revenue,
        nanny_earnings,
        commission_rate,
        fixed_fee,
        commission_amount
      ) VALUES (
        NEW.id,
        COALESCE(NEW.total_monthly_cost, NEW.monthly_rate_estimate, 0),
        revenue_data.admin_total_revenue,
        revenue_data.nanny_earnings,
        revenue_data.commission_percent,
        revenue_data.fixed_fee,
        revenue_data.commission_amount
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS auto_booking_financials ON public.bookings;
CREATE TRIGGER auto_booking_financials
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_booking_financials();

-- Phase 3: Update dashboard stats function to handle missing financial data
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  active_nannies bigint,
  total_clients bigint,
  today_bookings bigint,
  total_revenue numeric,
  support_tickets bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Active nannies (verified and can receive bookings)
    (SELECT COUNT(*) FROM public.nannies WHERE is_verified = true AND can_receive_bookings = true)::bigint,
    
    -- Total clients
    (SELECT COUNT(*) FROM public.clients)::bigint,
    
    -- Today's bookings
    (SELECT COUNT(*) FROM public.bookings WHERE DATE(created_at) = CURRENT_DATE)::bigint,
    
    -- Total revenue - use financial records if available, fallback to booking totals
    COALESCE(
      (SELECT SUM(bf.admin_revenue) FROM public.booking_financials bf 
       JOIN public.bookings b ON b.id = bf.booking_id 
       WHERE b.status = 'confirmed'),
      (SELECT SUM(b.total_monthly_cost) * 0.2 FROM public.bookings b WHERE b.status = 'confirmed'),
      0
    )::numeric,
    
    -- Support tickets (open + in progress)
    (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress'))::bigint;
END;
$$;

-- Phase 4: Populate existing booking financial records
SELECT public.populate_missing_booking_financials();