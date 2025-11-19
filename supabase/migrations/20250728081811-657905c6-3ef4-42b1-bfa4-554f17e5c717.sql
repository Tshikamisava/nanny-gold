-- Fix remaining security issues

-- Fix remaining functions that still need search_path
CREATE OR REPLACE FUNCTION public.update_clients_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_nanny_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, user_type, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client')::user_type,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- Fix the Security Definer View issue
-- Replace the existing view with a regular view without SECURITY DEFINER
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
  p.first_name,
  p.last_name,
  p.location,
  n.skills,
  n.languages,
  n.approval_status
FROM public.nannies n
JOIN public.profiles p ON n.id = p.id
WHERE n.is_available = true 
  AND n.approval_status = 'approved';