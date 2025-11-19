-- Create function to get valid client-nanny chat rooms based on bookings
CREATE OR REPLACE FUNCTION public.get_nanny_chat_rooms_with_booking_validation(nanny_id_param uuid)
RETURNS TABLE(
  room_id uuid, 
  room_type text, 
  room_name text, 
  other_participant_id uuid, 
  other_participant_name text, 
  last_message text, 
  last_message_at timestamp with time zone, 
  unread_count bigint,
  booking_status text
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
    COALESCE(unread.count, 0) as unread_count,
    COALESCE(booking_info.status, 'no_booking') as booking_status
  FROM public.chat_rooms cr
  JOIN public.chat_room_participants my_participants ON my_participants.room_id = cr.id AND my_participants.user_id = nanny_id_param
  LEFT JOIN public.chat_room_participants other_participants ON other_participants.room_id = cr.id AND other_participants.user_id != nanny_id_param
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
      AND sender_id != nanny_id_param
  ) unread ON true
  LEFT JOIN LATERAL (
    SELECT b.status
    FROM public.bookings b
    WHERE b.nanny_id = nanny_id_param 
      AND b.client_id = other_participants.user_id
      AND b.status IN ('confirmed', 'pending', 'in_progress')
    ORDER BY b.created_at DESC
    LIMIT 1
  ) booking_info ON cr.type = 'client_nanny'
  WHERE 
    -- Always show admin chats
    cr.type = 'client_admin'
    OR 
    -- Only show client chats if there's an active/upcoming booking
    (cr.type = 'client_nanny' AND booking_info.status IS NOT NULL)
  ORDER BY latest_msg.created_at DESC NULLS LAST;
END;
$$;