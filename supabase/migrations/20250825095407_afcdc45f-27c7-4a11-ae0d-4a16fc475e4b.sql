-- Create optimized dashboard stats function for better performance
CREATE OR REPLACE FUNCTION get_dashboard_stats()
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
DECLARE
  today_date date := CURRENT_DATE;
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM nannies WHERE approval_status = 'approved' AND is_available = true)::bigint as active_nannies,
    (SELECT COUNT(*) FROM clients)::bigint as total_clients,
    (SELECT COUNT(*) FROM bookings WHERE start_date = today_date AND status IN ('confirmed', 'pending'))::bigint as today_bookings,
    (SELECT COALESCE(SUM(total_monthly_cost), 0) FROM bookings WHERE status = 'confirmed' LIMIT 1000)::numeric as total_revenue,
    (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress'))::bigint as support_tickets;
END;
$$;