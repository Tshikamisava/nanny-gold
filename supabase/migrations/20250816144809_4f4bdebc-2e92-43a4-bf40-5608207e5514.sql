-- Fix the ambiguous column reference issue in get_user_chat_rooms function
CREATE OR REPLACE FUNCTION public.get_user_chat_rooms(user_id_param UUID)
RETURNS TABLE(
  room_id UUID,
  room_type TEXT,
  room_name TEXT,
  other_participant_id UUID,
  other_participant_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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