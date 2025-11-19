-- Add service category fields to nannies table
ALTER TABLE public.nannies 
ADD COLUMN service_categories TEXT[] DEFAULT ARRAY['long_term'],
ADD COLUMN admin_assigned_categories TEXT[] DEFAULT NULL;

-- Create booking reassignments tracking table
CREATE TABLE public.booking_reassignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_booking_id UUID NOT NULL,
  original_nanny_id UUID NOT NULL,
  new_nanny_id UUID NOT NULL,
  client_id UUID NOT NULL,
  reassignment_reason TEXT NOT NULL DEFAULT 'nanny_rejection',
  client_response TEXT DEFAULT 'pending', -- 'accepted', 'rejected', 'pending'
  alternative_nannies JSONB DEFAULT '[]'::jsonb,
  escalated_to_admin BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on booking reassignments
ALTER TABLE public.booking_reassignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking reassignments
CREATE POLICY "Clients can view their reassignments" 
ON public.booking_reassignments 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all reassignments" 
ON public.booking_reassignments 
FOR ALL 
USING (is_admin());

CREATE POLICY "Clients can update their response" 
ON public.booking_reassignments 
FOR UPDATE 
USING (auth.uid() = client_id);

CREATE POLICY "System can create reassignments" 
ON public.booking_reassignments 
FOR INSERT 
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_booking_reassignments_updated_at
BEFORE UPDATE ON public.booking_reassignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();