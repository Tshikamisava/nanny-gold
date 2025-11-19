-- Fix database security vulnerabilities identified by linter

-- 1. Fix function search path security issue for functions missing SET search_path
CREATE OR REPLACE FUNCTION public.set_default_payment_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If this is the first payment method, make it default
  IF NEW.is_default = false THEN
    PERFORM 1 FROM public.client_payment_methods 
    WHERE client_id = NEW.client_id AND id != NEW.id;
    
    IF NOT FOUND THEN
      NEW.is_default = true;
    END IF;
  END IF;
  
  -- If setting as default, unset others
  IF NEW.is_default = true THEN
    UPDATE public.client_payment_methods
    SET is_default = false
    WHERE client_id = NEW.client_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Ensure all other functions have proper search_path set (update any missing ones)
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

-- 3. Fix the available_nannies_with_location view security issue
-- Drop the existing view and recreate without security definer
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
  prof.first_name,
  prof.last_name,
  prof.location,
  n.skills,
  n.languages,
  n.approval_status
FROM public.nannies n
JOIN public.profiles prof ON prof.id = n.id
LEFT JOIN public.profiles p ON p.id = n.id
WHERE n.approval_status = 'approved' 
  AND n.is_available = true;