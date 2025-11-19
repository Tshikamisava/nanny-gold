-- Fix support ticket creation for nannies and enable realtime for chat
-- First, let's ensure nannies can create support tickets by updating RLS policy
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;

CREATE POLICY "Users can create support tickets" ON public.support_tickets
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure the get_user_chat_rooms function exists and works properly
CREATE OR REPLACE FUNCTION public.get_user_chat_rooms(user_id_param uuid)
RETURNS TABLE(
  room_id uuid, 
  room_type text, 
  room_name text, 
  other_participant_id uuid, 
  other_participant_name text, 
  last_message text, 
  last_message_at timestamp with time zone, 
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.type as room_type,
    COALESCE(cr.name, 
      CASE 
        WHEN cr.type = 'client_admin' THEN 'Admin Support'
        ELSE CONCAT(p.first_name, ' ', p.last_name)
      END
    ) as room_name,
    other_participants.user_id as other_participant_id,
    CONCAT(p.first_name, ' ', p.last_name) as other_participant_name,
    COALESCE(latest_msg.content, 'No messages yet') as last_message,
    latest_msg.created_at as last_message_at,
    COALESCE(unread.count, 0) as unread_count
  FROM public.chat_rooms cr
  JOIN public.chat_room_participants my_participants ON my_participants.room_id = cr.id AND my_participants.user_id = user_id_param
  LEFT JOIN public.chat_room_participants other_participants ON other_participants.room_id = cr.id AND other_participants.user_id != user_id_param
  LEFT JOIN public.profiles p ON p.id = other_participants.user_id
  LEFT JOIN LATERAL (
    SELECT content, created_at 
    FROM public.chat_messages 
    WHERE room_id = cr.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) latest_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM public.chat_messages 
    WHERE room_id = cr.id 
      AND created_at > COALESCE(my_participants.last_seen_at, '1970-01-01'::timestamp)
      AND sender_id != user_id_param
  ) unread ON true
  ORDER BY latest_msg.created_at DESC NULLS LAST;
END;
$$;

-- Function to create chat room between admin and user for support
CREATE OR REPLACE FUNCTION public.create_admin_support_room(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  room_id UUID;
  admin_id UUID;
BEGIN
  -- Get any admin user
  SELECT ur.user_id INTO admin_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin users found';
  END IF;
  
  -- Check if room already exists between this user and any admin
  SELECT cr.id INTO room_id
  FROM public.chat_rooms cr
  WHERE cr.type = 'client_admin'
    AND EXISTS (
      SELECT 1 FROM public.chat_room_participants crp1 
      WHERE crp1.room_id = cr.id AND crp1.user_id = user_id_param
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_room_participants crp2 
      WHERE crp2.room_id = cr.id AND crp2.user_id = admin_id
    );
  
  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO public.chat_rooms (type, name, created_by)
    VALUES ('client_admin', 'Admin Support', user_id_param)
    RETURNING id INTO room_id;
    
    -- Add both participants
    INSERT INTO public.chat_room_participants (room_id, user_id)
    VALUES (room_id, user_id_param), (room_id, admin_id);
  END IF;
  
  RETURN room_id;
END;
$$;

-- Enable realtime for chat tables
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_room_participants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_participants;