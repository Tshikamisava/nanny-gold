-- Fix the RLS policy to properly allow service role and authenticated users
-- to insert system messages

-- First, let's check current policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'support_chat_messages';

-- Drop the current policy
DROP POLICY IF EXISTS "Allow system messages to be inserted" ON public.support_chat_messages;

-- Create a more permissive policy for system messages that works with service role
CREATE POLICY "System can insert system messages" 
ON public.support_chat_messages 
FOR INSERT 
WITH CHECK (
  sender_id = 'system' AND (
    auth.role() = 'service_role' OR 
    auth.role() = 'authenticated' OR
    current_setting('role') = 'service_role'
  )
);