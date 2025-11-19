-- Fix sender_id column by temporarily dropping and recreating RLS policies

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can send messages for their tickets" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Admins can manage all chat messages" ON public.support_chat_messages;

-- 2. Change column type to TEXT to allow 'system' value
ALTER TABLE public.support_chat_messages ALTER COLUMN sender_id TYPE TEXT;

-- 3. Recreate policies with updated logic
CREATE POLICY "Users can send messages for their tickets" 
ON public.support_chat_messages 
FOR INSERT 
WITH CHECK (
  (auth.uid()::text = sender_id) AND 
  (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_chat_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can view messages for their tickets" 
ON public.support_chat_messages 
FOR SELECT 
USING (
  (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_chat_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
  )) OR 
  is_admin()
);

CREATE POLICY "Admins can manage all chat messages" 
ON public.support_chat_messages 
FOR ALL 
USING (is_admin());