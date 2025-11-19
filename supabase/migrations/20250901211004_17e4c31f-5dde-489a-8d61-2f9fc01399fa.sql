-- Update get_dashboard_stats function to return actual admin revenue instead of total booking cost
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
AS $function$
DECLARE
  today_date date := CURRENT_DATE;
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM nannies WHERE approval_status = 'approved' AND is_available = true)::bigint as active_nannies,
    (SELECT COUNT(*) FROM clients)::bigint as total_clients,
    (SELECT COUNT(*) FROM bookings WHERE start_date = today_date AND status IN ('confirmed', 'pending'))::bigint as today_bookings,
    -- Calculate actual admin revenue instead of total booking cost
    (SELECT COALESCE(SUM(bf.admin_total_revenue), 0) 
     FROM booking_financials bf 
     JOIN bookings b ON b.id = bf.booking_id 
     WHERE b.status = 'confirmed' 
     LIMIT 1000)::numeric as total_revenue,
    (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress'))::bigint as support_tickets;
END;
$function$;