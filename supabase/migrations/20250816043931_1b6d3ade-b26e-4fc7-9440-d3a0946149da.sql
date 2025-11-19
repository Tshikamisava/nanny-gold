-- Fix Realtime Setup for Smart Chat Widget

-- 1. Set REPLICA IDENTITY FULL for proper realtime updates
ALTER TABLE public.support_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

-- 2. Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;