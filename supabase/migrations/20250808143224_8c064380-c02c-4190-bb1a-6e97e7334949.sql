-- Create chat_messages table for real-time messaging
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'nanny', 'admin')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat messages
CREATE POLICY "Users can view messages in their rooms" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.interviews i 
    WHERE i.id = room_id 
    AND (i.client_id = auth.uid() OR i.nanny_id = auth.uid())
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can create messages in their rooms" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND (
    EXISTS (
      SELECT 1 FROM public.interviews i 
      WHERE i.id = room_id 
      AND (i.client_id = auth.uid() OR i.nanny_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time updates for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;