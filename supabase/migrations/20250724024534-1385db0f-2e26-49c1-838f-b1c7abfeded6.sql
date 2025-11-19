-- Fix the search path security issue for the new function
CREATE OR REPLACE FUNCTION public.update_verification_step(
  p_nanny_id UUID,
  p_step_name TEXT,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.nanny_verification_steps (nanny_id, step_name, status, notes, completed_at)
  VALUES (
    p_nanny_id, 
    p_step_name, 
    p_status,
    p_notes,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (nanny_id, step_name) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();
END;
$$;