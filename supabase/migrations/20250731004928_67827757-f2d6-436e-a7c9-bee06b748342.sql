-- Fix security issues: Add search_path to all functions that don't have it
CREATE OR REPLACE FUNCTION public.get_nanny_availability(
  p_nanny_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  date_available date,
  available_slots jsonb,
  blocked_slots jsonb,
  has_bookings boolean,
  has_interviews boolean
)
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