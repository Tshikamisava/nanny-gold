-- Create professional development materials table
CREATE TABLE public.professional_development_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'document', 'quiz', 'task')),
  content_url TEXT,
  content_data JSONB DEFAULT '{}', -- For quiz questions, task details, etc.
  is_mandatory BOOLEAN DEFAULT true,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create professional development assignments table (links materials to nannies)
CREATE TABLE public.professional_development_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.professional_development_materials(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  UNIQUE(material_id, nanny_id)
);

-- Create professional development completions table
CREATE TABLE public.professional_development_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.professional_development_assignments(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL,
  material_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completion_data JSONB DEFAULT '{}', -- For quiz answers, task submissions, etc.
  score DECIMAL(5,2), -- For quizzes/assessments
  notes TEXT,
  verified_by UUID, -- Admin who verified completion
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Add professional development compliance field to nannies table
ALTER TABLE public.nannies 
ADD COLUMN pd_compliance_status TEXT DEFAULT 'compliant' CHECK (pd_compliance_status IN ('compliant', 'pending', 'suspended'));

-- Enable RLS on new tables
ALTER TABLE public.professional_development_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_development_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_development_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professional_development_materials
CREATE POLICY "Admins can manage all PD materials" 
ON public.professional_development_materials FOR ALL
USING (is_admin());

CREATE POLICY "Nannies can view active PD materials" 
ON public.professional_development_materials FOR SELECT
USING (is_active = true);

-- RLS Policies for professional_development_assignments
CREATE POLICY "Admins can manage all PD assignments" 
ON public.professional_development_assignments FOR ALL
USING (is_admin());

CREATE POLICY "Nannies can view their assignments" 
ON public.professional_development_assignments FOR SELECT
USING (auth.uid() = nanny_id);

CREATE POLICY "Nannies can update their assignment status" 
ON public.professional_development_assignments FOR UPDATE
USING (auth.uid() = nanny_id);

-- RLS Policies for professional_development_completions
CREATE POLICY "Admins can manage all PD completions" 
ON public.professional_development_completions FOR ALL
USING (is_admin());

CREATE POLICY "Nannies can create their completions" 
ON public.professional_development_completions FOR INSERT
WITH CHECK (auth.uid() = nanny_id);

CREATE POLICY "Nannies can view their completions" 
ON public.professional_development_completions FOR SELECT
USING (auth.uid() = nanny_id);

-- Create function to auto-assign materials to all nannies
CREATE OR REPLACE FUNCTION public.assign_material_to_all_nannies(
  p_material_id UUID,
  p_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.professional_development_assignments (material_id, nanny_id, due_date)
  SELECT 
    p_material_id,
    n.id,
    p_due_date
  FROM public.nannies n
  WHERE n.approval_status = 'approved'
  ON CONFLICT (material_id, nanny_id) DO NOTHING;
END;
$$;

-- Create function to update nanny compliance status
CREATE OR REPLACE FUNCTION public.update_nanny_pd_compliance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update compliance status based on overdue mandatory assignments
  UPDATE public.nannies 
  SET pd_compliance_status = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM public.professional_development_assignments pda
      JOIN public.professional_development_materials pdm ON pda.material_id = pdm.id
      WHERE pda.nanny_id = nannies.id 
        AND pdm.is_mandatory = true
        AND pda.status IN ('assigned', 'in_progress', 'overdue')
        AND pda.due_date < now()
        AND NOT EXISTS (
          SELECT 1 
          FROM public.professional_development_completions pdc 
          WHERE pdc.assignment_id = pda.id
        )
    ) THEN 'suspended'
    WHEN EXISTS (
      SELECT 1 
      FROM public.professional_development_assignments pda
      JOIN public.professional_development_materials pdm ON pda.material_id = pdm.id
      WHERE pda.nanny_id = nannies.id 
        AND pdm.is_mandatory = true
        AND pda.status IN ('assigned', 'in_progress')
        AND NOT EXISTS (
          SELECT 1 
          FROM public.professional_development_completions pdc 
          WHERE pdc.assignment_id = pda.id
        )
    ) THEN 'pending'
    ELSE 'compliant'
  END;
END;
$$;

-- Create trigger to update assignment status when due
CREATE OR REPLACE FUNCTION public.update_assignment_status()
RETURNS trigger
LANGUAGE plpgsql
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

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pd_materials_updated_at
  BEFORE UPDATE ON public.professional_development_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_pd_assignments_nanny_id ON public.professional_development_assignments(nanny_id);
CREATE INDEX idx_pd_assignments_material_id ON public.professional_development_assignments(material_id);
CREATE INDEX idx_pd_assignments_status ON public.professional_development_assignments(status);
CREATE INDEX idx_pd_completions_nanny_id ON public.professional_development_completions(nanny_id);
CREATE INDEX idx_pd_completions_assignment_id ON public.professional_development_completions(assignment_id);