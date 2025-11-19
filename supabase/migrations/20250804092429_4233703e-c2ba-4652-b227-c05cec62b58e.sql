-- Add super admin functionality
-- Add admin level column to distinguish between regular admin and super admin
ALTER TABLE public.admins 
ADD COLUMN admin_level text DEFAULT 'admin' CHECK (admin_level IN ('admin', 'super_admin'));

-- Update permissions structure to be more granular
COMMENT ON COLUMN public.admins.permissions IS 'JSON object defining specific permissions like: {"payments": true, "analytics": true, "professional_development": true, "user_management": true}';

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.admins a
    JOIN public.user_roles ur ON ur.user_id = a.id
    WHERE a.id = user_uuid 
      AND ur.role = 'admin' 
      AND a.admin_level = 'super_admin'
  );
$$;

-- Create function to get admin permissions
CREATE OR REPLACE FUNCTION public.get_admin_permissions(user_uuid uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(permissions, '{}'::jsonb)
  FROM public.admins
  WHERE id = user_uuid;
$$;

-- Enhanced nanny compliance tracking
-- Add created_at to professional_development_assignments for time tracking
ALTER TABLE public.professional_development_assignments 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Create function to check nanny training compliance (7 day rule)
CREATE OR REPLACE FUNCTION public.check_nanny_training_compliance(p_nanny_id uuid)
RETURNS table(
  is_compliant boolean,
  days_since_assignment integer,
  overdue_assignments integer,
  next_suspension_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_compliant boolean := true;
  v_days_since_assignment integer := 0;
  v_overdue_assignments integer := 0;
  v_next_suspension_date timestamp with time zone;
  v_earliest_assignment timestamp with time zone;
BEGIN
  -- Get earliest uncompleted mandatory assignment
  SELECT 
    MIN(pda.assigned_at),
    COUNT(*)
  INTO v_earliest_assignment, v_overdue_assignments
  FROM public.professional_development_assignments pda
  JOIN public.professional_development_materials pdm ON pda.material_id = pdm.id
  WHERE pda.nanny_id = p_nanny_id
    AND pdm.is_mandatory = true
    AND pda.status IN ('assigned', 'in_progress')
    AND NOT EXISTS (
      SELECT 1 
      FROM public.professional_development_completions pdc 
      WHERE pdc.assignment_id = pda.id
    );
  
  -- Calculate days since earliest assignment
  IF v_earliest_assignment IS NOT NULL THEN
    v_days_since_assignment := EXTRACT(days FROM (now() - v_earliest_assignment))::integer;
    v_next_suspension_date := v_earliest_assignment + interval '7 days';
    
    -- Check if compliance is violated (more than 7 days)
    IF v_days_since_assignment > 7 THEN
      v_is_compliant := false;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_is_compliant, v_days_since_assignment, v_overdue_assignments, v_next_suspension_date;
END;
$$;

-- Create automated compliance update function
CREATE OR REPLACE FUNCTION public.update_nanny_compliance_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update compliance status and can_receive_bookings based on training completion
  UPDATE public.nannies 
  SET 
    pd_compliance_status = CASE
      WHEN compliance_check.is_compliant = false THEN 'suspended'
      WHEN compliance_check.overdue_assignments > 0 THEN 'pending'
      ELSE 'compliant'
    END,
    can_receive_bookings = CASE
      WHEN compliance_check.is_compliant = false THEN false
      WHEN verification_status != 'verified' THEN false
      WHEN interview_status != 'passed' THEN false
      ELSE true
    END,
    updated_at = now()
  FROM (
    SELECT 
      n.id as nanny_id,
      ctc.is_compliant,
      ctc.overdue_assignments
    FROM public.nannies n
    CROSS JOIN LATERAL public.check_nanny_training_compliance(n.id) ctc
  ) compliance_check
  WHERE nannies.id = compliance_check.nanny_id;
END;
$$;

-- Create trigger to auto-update compliance when assignments change
CREATE OR REPLACE FUNCTION public.trigger_update_nanny_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update the specific nanny's compliance
  PERFORM public.update_nanny_compliance_status();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic compliance updates
DROP TRIGGER IF EXISTS update_compliance_on_assignment_change ON public.professional_development_assignments;
CREATE TRIGGER update_compliance_on_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_development_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_nanny_compliance();

DROP TRIGGER IF EXISTS update_compliance_on_completion_change ON public.professional_development_completions;
CREATE TRIGGER update_compliance_on_completion_change
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_development_completions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_nanny_compliance();