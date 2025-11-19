-- Fix the view issue (remove SECURITY DEFINER)
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
FROM nannies n
JOIN profiles pr ON n.id = pr.id
LEFT JOIN profiles p ON n.id = p.id
WHERE n.is_available = true 
  AND n.approval_status = 'approved';