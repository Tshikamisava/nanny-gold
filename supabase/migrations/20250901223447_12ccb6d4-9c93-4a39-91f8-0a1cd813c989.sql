-- Create comprehensive dashboard stats function
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
    -- Active nannies (approved and available)
    (SELECT COUNT(*) FROM public.nannies 
     WHERE approval_status = 'approved' 
     AND is_available = true)::bigint as active_nannies,
    
    -- Total clients with profiles
    (SELECT COUNT(*) FROM public.clients c
     JOIN public.profiles p ON p.id = c.id)::bigint as total_clients,
    
    -- Today's bookings (created today)
    (SELECT COUNT(*) FROM public.bookings 
     WHERE DATE(created_at) = CURRENT_DATE)::bigint as today_bookings,
    
    -- Total revenue from booking financials
    (SELECT COALESCE(SUM(bf.admin_total_revenue), 0)
     FROM public.booking_financials bf
     JOIN public.bookings b ON b.id = bf.booking_id
     WHERE b.status IN ('confirmed', 'active', 'completed'))::numeric as total_revenue,
    
    -- Open support tickets
    (SELECT COUNT(*) FROM public.support_tickets 
     WHERE status IN ('open', 'in_progress'))::bigint as support_tickets;
END;
$$;

-- Create unified revenue calculation function
CREATE OR REPLACE FUNCTION public.calculate_unified_revenue(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_booking_type text DEFAULT NULL
)
RETURNS TABLE(
  total_revenue numeric,
  placement_fees numeric,
  commission_revenue numeric,
  booking_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(bf.admin_total_revenue), 0) as total_revenue,
    COALESCE(SUM(bf.fixed_fee), 0) as placement_fees,
    COALESCE(SUM(bf.commission_amount), 0) as commission_revenue,
    COUNT(b.id) as booking_count
  FROM public.booking_financials bf
  JOIN public.bookings b ON b.id = bf.booking_id
  WHERE b.status IN ('confirmed', 'active', 'completed')
    AND (p_start_date IS NULL OR b.created_at >= p_start_date)
    AND (p_end_date IS NULL OR b.created_at <= p_end_date)
    AND (p_booking_type IS NULL OR b.booking_type = p_booking_type);
END;
$$;

-- Create function to accept booking on behalf of nanny
CREATE OR REPLACE FUNCTION public.accept_booking_on_behalf(
  p_booking_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Admin approval on behalf of nanny'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking_record public.bookings%ROWTYPE;
  v_nanny_name text;
  v_client_name text;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking_record
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Only accept pending bookings
  IF v_booking_record.status != 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be accepted';
  END IF;
  
  -- Get nanny and client names for notifications
  SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_nanny_name
  FROM public.profiles p
  WHERE p.id = v_booking_record.nanny_id;
  
  SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_client_name
  FROM public.profiles p
  WHERE p.id = v_booking_record.client_id;
  
  -- Update booking status to confirmed
  UPDATE public.bookings
  SET 
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Notify nanny
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    v_booking_record.nanny_id,
    'Booking Confirmed by Admin',
    'Your booking with ' || v_client_name || ' has been confirmed by our admin team.',
    'booking_admin_accepted',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'admin_reason', p_reason,
      'client_name', v_client_name
    )
  );
  
  -- Notify client
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    v_booking_record.client_id,
    'Booking Confirmed',
    'Your booking with ' || v_nanny_name || ' has been confirmed.',
    'booking_confirmed',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'nanny_name', v_nanny_name,
      'admin_approved', true
    )
  );
  
  RETURN true;
END;
$$;

-- Create improved nanny search function for reassignment
CREATE OR REPLACE FUNCTION public.search_bookings_for_reassignment(
  p_search_term text
)
RETURNS TABLE(
  booking_id uuid,
  client_name text,
  nanny_name text,
  booking_type text,
  status text,
  total_cost numeric,
  start_date date,
  client_id uuid,
  nanny_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
    CONCAT(np.first_name, ' ', np.last_name) as nanny_name,
    b.booking_type,
    b.status,
    b.total_monthly_cost as total_cost,
    b.start_date,
    b.client_id,
    b.nanny_id
  FROM public.bookings b
  JOIN public.profiles cp ON cp.id = b.client_id
  JOIN public.profiles np ON np.id = b.nanny_id
  WHERE b.status IN ('confirmed', 'active')
    AND (
      LOWER(cp.first_name) LIKE LOWER('%' || p_search_term || '%') OR
      LOWER(cp.last_name) LIKE LOWER('%' || p_search_term || '%') OR
      LOWER(np.first_name) LIKE LOWER('%' || p_search_term || '%') OR
      LOWER(np.last_name) LIKE LOWER('%' || p_search_term || '%') OR
      LOWER(CONCAT(cp.first_name, ' ', cp.last_name)) LIKE LOWER('%' || p_search_term || '%') OR
      LOWER(CONCAT(np.first_name, ' ', np.last_name)) LIKE LOWER('%' || p_search_term || '%') OR
      b.id::text LIKE '%' || p_search_term || '%'
    )
  ORDER BY b.created_at DESC
  LIMIT 10;
END;
$$;