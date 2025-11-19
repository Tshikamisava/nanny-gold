-- Enhance nanny_availability table for comprehensive calendar functionality
ALTER TABLE public.nanny_availability 
ADD COLUMN IF NOT EXISTS recurring_schedule jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS time_slots jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS emergency_available boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS advance_notice_days integer DEFAULT 7;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nanny_availability_dates ON public.nanny_availability USING GIN (available_dates);
CREATE INDEX IF NOT EXISTS idx_nanny_availability_unavailable ON public.nanny_availability USING GIN (unavailable_dates);

-- Create function to check availability conflicts
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  p_nanny_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL
) 
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

-- Create function to get nanny availability for date range
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
    '[]'::jsonb as blocked_slots, -- Will be enhanced based on unavailable_dates
    ad.has_bookings,
    ad.has_interviews
  FROM availability_data ad;
END;
$$;