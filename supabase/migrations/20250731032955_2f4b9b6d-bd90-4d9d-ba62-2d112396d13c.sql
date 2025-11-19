-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.update_assignment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;