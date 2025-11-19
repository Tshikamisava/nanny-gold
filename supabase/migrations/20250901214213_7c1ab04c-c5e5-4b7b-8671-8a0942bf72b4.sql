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
  calculated_days INTEGER;
BEGIN
  -- Loop through confirmed bookings that don't have financial records
  FOR booking_record IN 
    SELECT b.id, b.total_monthly_cost, b.base_rate, b.booking_type, b.start_date, b.end_date
    FROM public.bookings b
    LEFT JOIN public.booking_financials bf ON bf.booking_id = b.id
    WHERE b.status = 'confirmed' AND bf.id IS NULL
  LOOP
    -- Calculate booking days
    calculated_days := COALESCE(
      CASE 
        WHEN booking_record.end_date IS NOT NULL 
        THEN GREATEST(1, booking_record.end_date - booking_record.start_date + 1)
        ELSE 1
      END,
      1
    );
    
    -- Calculate revenue breakdown for this booking
    SELECT * INTO revenue_data 
    FROM public.calculate_booking_revenue(
      booking_record.id,
      COALESCE(booking_record.total_monthly_cost, booking_record.base_rate, 0),
      booking_record.booking_type,
      COALESCE(booking_record.total_monthly_cost, booking_record.base_rate),
      calculated_days
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
      COALESCE(booking_record.total_monthly_cost, booking_record.base_rate, 0),
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
  calculated_days INTEGER;
BEGIN
  -- Only create financial records for confirmed bookings
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    -- Check if financial record already exists
    IF NOT EXISTS (SELECT 1 FROM public.booking_financials WHERE booking_id = NEW.id) THEN
      -- Calculate booking days
      calculated_days := COALESCE(
        CASE 
          WHEN NEW.end_date IS NOT NULL 
          THEN GREATEST(1, NEW.end_date - NEW.start_date + 1)
          ELSE 1
        END,
        1
      );
      
      -- Calculate revenue breakdown
      SELECT * INTO revenue_data 
      FROM public.calculate_booking_revenue(
        NEW.id,
        COALESCE(NEW.total_monthly_cost, NEW.base_rate, 0),
        NEW.booking_type,
        COALESCE(NEW.total_monthly_cost, NEW.base_rate),
        calculated_days
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
        COALESCE(NEW.total_monthly_cost, NEW.base_rate, 0),
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
      (SELECT SUM(COALESCE(b.total_monthly_cost, b.base_rate, 0)) * 0.2 FROM public.bookings b WHERE b.status = 'confirmed'),
      0
    )::numeric,
    
    -- Support tickets (open + in progress)
    (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress'))::bigint;
END;
$$;

-- Phase 4: Populate existing booking financial records
SELECT public.populate_missing_booking_financials();