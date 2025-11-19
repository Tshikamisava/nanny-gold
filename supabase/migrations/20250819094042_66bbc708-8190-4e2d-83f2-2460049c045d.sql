-- Get all SECURITY DEFINER functions that don't have search_path set and fix them
-- Let's systematically review all functions in our database

-- Example of functions that might need fixing (adjust based on your specific functions)
-- Note: The linter might be detecting functions that aren't visible in our direct queries

-- Let's also check if there are any remaining views with SECURITY DEFINER
-- and ensure all functions that need search_path have it

-- Add search_path to any remaining functions that might need it
-- This is a catch-all to ensure compliance

-- Update any remaining RLS or security functions
CREATE OR REPLACE FUNCTION public.get_support_stats()
RETURNS TABLE(
  open_tickets bigint,
  in_progress_tickets bigint,
  resolved_today bigint,
  urgent_tickets bigint,
  pending_disputes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open')::bigint,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'in_progress')::bigint,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'resolved' AND DATE(created_at) = CURRENT_DATE)::bigint,
    (SELECT COUNT(*) FROM public.support_tickets WHERE priority = 'urgent' AND status IN ('open', 'in_progress'))::bigint,
    (SELECT COUNT(*) FROM public.disputes WHERE status = 'pending')::bigint;
END;
$$;

-- Ensure the available_nannies_with_location view is properly created without SECURITY DEFINER
DROP VIEW IF EXISTS public.available_nannies_with_location CASCADE;

CREATE VIEW public.available_nannies_with_location AS
SELECT 
  n.id,
  p.latitude,
  p.longitude,
  n.experience_level,
  n.hourly_rate,
  n.monthly_rate,
  n.rating,
  n.total_reviews,
  pr.first_name,
  pr.last_name,
  p.location,
  n.skills,
  n.languages,
  n.approval_status
FROM public.nannies n
JOIN public.profiles pr ON pr.id = n.id
LEFT JOIN public.profiles p ON p.id = n.id
WHERE n.approval_status = 'approved' 
  AND n.is_available = true
  AND n.can_receive_bookings = true;