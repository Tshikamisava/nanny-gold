-- Fix remaining functions without proper search_path
-- This addresses the remaining SECURITY DEFINER functions

-- Fix auto_accept_backup_nanny function
CREATE OR REPLACE FUNCTION public.auto_accept_backup_nanny()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-accept backup nanny requests where deadline has passed
  UPDATE public.backup_nanny_requests
  SET 
    status = 'accepted',
    responded_at = now()
  WHERE status = 'pending'
    AND client_response_deadline < now();
    
  -- Create new bookings for auto-accepted backup requests
  INSERT INTO public.bookings (
    client_id,
    nanny_id,
    status,
    start_date,
    end_date,
    schedule,
    living_arrangement,
    services,
    base_rate,
    additional_services_cost,
    total_monthly_cost
  )
  SELECT 
    bnr.client_id,
    bnr.backup_nanny_id,
    'confirmed',
    b.start_date,
    b.end_date,
    b.schedule,
    b.living_arrangement,
    b.services,
    n.monthly_rate,
    b.additional_services_cost,
    n.monthly_rate + b.additional_services_cost
  FROM public.backup_nanny_requests bnr
  JOIN public.bookings b ON b.id = bnr.original_booking_id
  JOIN public.nannies n ON n.id = bnr.backup_nanny_id
  WHERE bnr.status = 'accepted'
    AND bnr.responded_at = now()
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE client_id = bnr.client_id 
        AND nanny_id = bnr.backup_nanny_id 
        AND status = 'confirmed'
    );
END;
$$;

-- Fix check_booking_conflicts function
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(p_nanny_id uuid, p_start_date date, p_end_date date DEFAULT NULL::date, p_start_time time without time zone DEFAULT NULL::time without time zone, p_end_time time without time zone DEFAULT NULL::time without time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conflict_count integer := 0;
BEGIN
  -- Check for booking conflicts
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE nanny_id = p_nanny_id
    AND status IN ('confirmed', 'pending')
    AND (
      (p_end_date IS NULL AND start_date = p_start_date) OR
      (p_end_date IS NOT NULL AND start_date <= p_end_date AND (end_date IS NULL OR end_date >= p_start_date))
    );
  
  -- Check for interview conflicts
  SELECT COUNT(*) + conflict_count INTO conflict_count
  FROM public.interviews
  WHERE nanny_id = p_nanny_id
    AND status = 'scheduled'
    AND interview_date BETWEEN p_start_date AND COALESCE(p_end_date, p_start_date);
  
  RETURN conflict_count > 0;
END;
$$;

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ '^INV-\d+$';
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- Fix generate_advice_number function
CREATE OR REPLACE FUNCTION public.generate_advice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  advice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(advice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.nanny_payment_advice
  WHERE advice_number ~ '^ADV-\d+$';
  
  advice_num := 'ADV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN advice_num;
END;
$$;

-- Fix update_nanny_compliance_status function
CREATE OR REPLACE FUNCTION public.update_nanny_compliance_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update compliance status and can_receive_bookings based on training completion
  UPDATE public.nannies 
  SET 
    pd_compliance_status = CASE
      WHEN compliance_check.is_compliant = false THEN 'suspended'
      WHEN compliance_check.overdue_assignments > 0 THEN 'pending'
      ELSE 'compliant'
    END,
    can_receive_bookings = CASE
      WHEN compliance_check.is_compliant = false THEN false
      WHEN verification_status != 'verified' THEN false
      WHEN interview_status != 'passed' THEN false
      ELSE true
    END,
    updated_at = now()
  FROM (
    SELECT 
      n.id as nanny_id,
      ctc.is_compliant,
      ctc.overdue_assignments
    FROM public.nannies n
    CROSS JOIN LATERAL public.check_nanny_training_compliance(n.id) ctc
  ) compliance_check
  WHERE nannies.id = compliance_check.nanny_id;
END;
$$;

-- Fix get_nanny_availability function
CREATE OR REPLACE FUNCTION public.get_nanny_availability(p_nanny_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(date_available date, available_slots jsonb, blocked_slots jsonb, has_bookings boolean, has_interviews boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS check_date
  ),
  availability_data AS (
    SELECT 
      ds.check_date,
      na.available_dates,
      na.unavailable_dates,
      na.time_slots,
      na.recurring_schedule,
      CASE WHEN EXISTS(
        SELECT 1 FROM public.bookings b 
        WHERE b.nanny_id = p_nanny_id 
          AND b.start_date <= ds.check_date 
          AND (b.end_date IS NULL OR b.end_date >= ds.check_date)
          AND b.status IN ('confirmed', 'pending')
      ) THEN true ELSE false END as has_bookings,
      CASE WHEN EXISTS(
        SELECT 1 FROM public.interviews i 
        WHERE i.nanny_id = p_nanny_id 
          AND i.interview_date = ds.check_date
          AND i.status = 'scheduled'
      ) THEN true ELSE false END as has_interviews
    FROM date_series ds
    LEFT JOIN public.nanny_availability na ON na.nanny_id = p_nanny_id
  )
  SELECT 
    ad.check_date,
    COALESCE(ad.time_slots, '[]'::jsonb) as available_slots,
    '[]'::jsonb as blocked_slots,
    ad.has_bookings,
    ad.has_interviews
  FROM availability_data ad;
END;
$$;

-- Fix update_nanny_rating function
CREATE OR REPLACE FUNCTION public.update_nanny_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.nannies
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.reviews
      WHERE nanny_id = NEW.nanny_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE nanny_id = NEW.nanny_id
    ),
    updated_at = now()
  WHERE id = NEW.nanny_id;
  
  RETURN NEW;
END;
$$;