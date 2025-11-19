-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  nanny_id UUID NOT NULL,
  interview_date DATE NOT NULL,
  interview_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  meeting_link TEXT,
  calendar_event_id TEXT,
  notes TEXT,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view their interviews" 
ON public.interviews 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Nannies can view their interviews" 
ON public.interviews 
FOR SELECT 
USING (auth.uid() = nanny_id);

CREATE POLICY "Admins can view all interviews" 
ON public.interviews 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Clients can create interviews" 
ON public.interviews 
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their interviews" 
ON public.interviews 
FOR UPDATE 
USING (auth.uid() = client_id);

CREATE POLICY "Nannies can update interview status" 
ON public.interviews 
FOR UPDATE 
USING (auth.uid() = nanny_id);

CREATE POLICY "Admins can manage all interviews" 
ON public.interviews 
FOR ALL 
USING (is_admin());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_interviews_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_interviews_client_id ON public.interviews(client_id);
CREATE INDEX idx_interviews_nanny_id ON public.interviews(nanny_id);
CREATE INDEX idx_interviews_date ON public.interviews(interview_date);
CREATE INDEX idx_interviews_status ON public.interviews(status);