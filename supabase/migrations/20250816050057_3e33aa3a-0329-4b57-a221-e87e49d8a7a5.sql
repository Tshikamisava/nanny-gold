-- Fix RLS policies to allow system to insert chat messages
-- Remove the conflicting policies first
DROP POLICY IF EXISTS "Allow service role to insert system messages" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated role for system messages" ON public.support_chat_messages;

-- Create a policy that allows any authenticated user/service to insert system messages
CREATE POLICY "Allow system messages to be inserted" 
ON public.support_chat_messages 
FOR INSERT 
WITH CHECK (sender_id = 'system');