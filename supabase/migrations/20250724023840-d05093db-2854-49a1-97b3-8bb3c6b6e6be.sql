-- Create document uploads table for nanny verification
CREATE TABLE public.nanny_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES public.nannies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_document', 'criminal_check', 'reference_letter', 'certification', 'bank_details', 'medical_certificate')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nanny_documents ENABLE ROW LEVEL SECURITY;

-- Policies for document access
CREATE POLICY "Nannies can view their own documents" 
ON public.nanny_documents 
FOR SELECT 
USING (nanny_id = auth.uid());

CREATE POLICY "Nannies can upload their own documents" 
ON public.nanny_documents 
FOR INSERT 
WITH CHECK (nanny_id = auth.uid());

CREATE POLICY "Admins can manage all documents" 
ON public.nanny_documents 
FOR ALL 
USING (public.is_admin());

-- Create verification steps tracking
CREATE TABLE public.nanny_verification_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES public.nannies(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL CHECK (step_name IN ('profile_complete', 'documents_uploaded', 'background_check', 'interview_completed', 'references_verified', 'approved')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nanny_id, step_name)
);

-- Enable RLS
ALTER TABLE public.nanny_verification_steps ENABLE ROW LEVEL SECURITY;

-- Policies for verification steps
CREATE POLICY "Nannies can view their own verification steps" 
ON public.nanny_verification_steps 
FOR SELECT 
USING (nanny_id = auth.uid());

CREATE POLICY "Admins can manage all verification steps" 
ON public.nanny_verification_steps 
FOR ALL 
USING (public.is_admin());

-- Create app access tracking (to know which app user came from)
CREATE TABLE public.user_app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_type TEXT NOT NULL CHECK (app_type IN ('client_app', 'nanny_app', 'admin_app')),
  last_access TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, app_type)
);

-- Enable RLS
ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

-- Policy for app access
CREATE POLICY "Users can manage their own app access" 
ON public.user_app_access 
FOR ALL 
USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX idx_nanny_documents_nanny_id ON public.nanny_documents(nanny_id);
CREATE INDEX idx_nanny_documents_status ON public.nanny_documents(verification_status);
CREATE INDEX idx_verification_steps_nanny_id ON public.nanny_verification_steps(nanny_id);
CREATE INDEX idx_verification_steps_status ON public.nanny_verification_steps(status);
CREATE INDEX idx_user_app_access_user_id ON public.user_app_access(user_id);

-- Function to update verification step
CREATE OR REPLACE FUNCTION public.update_verification_step(
  p_nanny_id UUID,
  p_step_name TEXT,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;