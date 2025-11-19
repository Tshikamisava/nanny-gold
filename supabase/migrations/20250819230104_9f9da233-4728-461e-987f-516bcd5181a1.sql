-- Fix the ambiguous column reference in get_or_create_chat_room function
CREATE OR REPLACE FUNCTION public.get_or_create_chat_room(participant1_id uuid, participant2_id uuid, room_type text DEFAULT 'client_nanny'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id UUID;
BEGIN
  -- Check if room already exists between these two users
  SELECT cr.id INTO v_room_id
  FROM public.chat_rooms cr
  WHERE cr.type = room_type
    AND EXISTS (
      SELECT 1 FROM public.chat_room_participants crp1 
      WHERE crp1.room_id = cr.id AND crp1.user_id = participant1_id
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_room_participants crp2 
      WHERE crp2.room_id = cr.id AND crp2.user_id = participant2_id
    )
    AND (
      SELECT COUNT(*) FROM public.chat_room_participants 
      WHERE chat_room_participants.room_id = cr.id
    ) = 2;
  
  -- If no room exists, create one
  IF v_room_id IS NULL THEN
    INSERT INTO public.chat_rooms (type, created_by)
    VALUES (room_type, participant1_id)
    RETURNING id INTO v_room_id;
    
    -- Add both participants
    INSERT INTO public.chat_room_participants (room_id, user_id)
    VALUES (v_room_id, participant1_id), (v_room_id, participant2_id);
  END IF;
  
  RETURN v_room_id;
END;
$function$;

-- Create missing send_chat_message function for AdminChatRooms
CREATE OR REPLACE FUNCTION public.send_chat_message(
  room_id_param uuid,
  content_param text,
  sender_name_param text,
  sender_type_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    content,
    sender_name,
    sender_type
  ) VALUES (
    room_id_param,
    auth.uid(),
    content_param,
    sender_name_param,
    sender_type_param
  );
END;
$function$;

-- Fix RLS policy for support tickets to allow admins to view all
CREATE POLICY "Support tickets admin access" 
ON public.support_tickets 
FOR ALL
TO authenticated
USING (is_admin());