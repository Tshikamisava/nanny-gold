-- Fix the Security Definer View issue by recreating available_nannies_with_location as a regular view
DROP VIEW IF EXISTS public.available_nannies_with_location;

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

-- Fix any functions missing search_path
CREATE OR REPLACE FUNCTION public.set_default_payment_method(p_client_id uuid, p_payment_method_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Set all other payment methods to non-default
  UPDATE public.client_payment_methods 
  SET is_default = false 
  WHERE client_id = p_client_id;
  
  -- Set the specified payment method as default
  UPDATE public.client_payment_methods 
  SET is_default = true 
  WHERE id = p_payment_method_id AND client_id = p_client_id;
END;
$function$;

-- Update the assignment status function to include search_path
CREATE OR REPLACE FUNCTION public.update_assignment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update overdue assignments
  UPDATE public.professional_development_assignments
  SET status = 'overdue'
  WHERE due_date < now() 
    AND status IN ('assigned', 'in_progress')
    AND NOT EXISTS (
      SELECT 1 
      FROM public.professional_development_completions 
      WHERE assignment_id = id
    );
  
  RETURN NULL;
END;
$function$;