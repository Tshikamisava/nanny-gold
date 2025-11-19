-- Add policy to allow system messages to be inserted by service roles
CREATE POLICY "Allow service role to insert system messages" 
ON public.support_chat_messages 
FOR INSERT 
WITH CHECK (sender_id = 'system');

-- Also allow authenticated service to insert system messages
CREATE POLICY "Allow authenticated role for system messages" 
ON public.support_chat_messages 
FOR INSERT 
WITH CHECK (
  sender_id = 'system' AND auth.role() = 'authenticated'
);