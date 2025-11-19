-- Add calendar event tracking to interviews table
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS calendar_event_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS calendar_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS calendar_event_data JSONB DEFAULT '{}';

-- Create calendar events tracking table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'google', 'outlook', 'apple', 'ics'
  event_id TEXT, -- Platform specific event ID
  attendee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'created', 'updated', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_events
CREATE POLICY "Users can view their calendar events" 
ON public.calendar_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.interviews i 
    WHERE i.id = calendar_events.interview_id 
    AND (i.client_id = auth.uid() OR i.nanny_id = auth.uid())
  )
  OR is_admin()
);

CREATE POLICY "System can manage calendar events" 
ON public.calendar_events 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();