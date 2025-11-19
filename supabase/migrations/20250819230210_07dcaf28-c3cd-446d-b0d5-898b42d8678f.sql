-- Drop and recreate the send_chat_message function with correct signature
DROP FUNCTION IF EXISTS public.send_chat_message(uuid, text, text, text);

-- Create the send_chat_message function for AdminChatRooms
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

-- Also create missing get_nanny_chat_rooms_with_booking_validation function
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
AS $function$
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
    COALESCE(
      CASE 
        WHEN cr.type = 'client_admin' THEN 'admin_support'
        WHEN b.id IS NOT NULL AND b.status IN ('confirmed', 'pending') THEN b.status::text
        WHEN b.id IS NOT NULL AND b.status NOT IN ('confirmed', 'pending') THEN 'past_booking'
        ELSE 'no_booking'
      END,
      'no_booking'
    ) as booking_status
  FROM public.chat_rooms cr
  JOIN public.chat_room_participants my_participants ON my_participants.room_id = cr.id AND my_participants.user_id = nanny_id_param
  LEFT JOIN public.chat_room_participants other_participants ON other_participants.room_id = cr.id AND other_participants.user_id != nanny_id_param
  LEFT JOIN public.profiles p ON p.id = other_participants.user_id
  LEFT JOIN public.bookings b ON (
    (b.client_id = other_participants.user_id AND b.nanny_id = nanny_id_param) OR
    cr.type = 'client_admin'
  )
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
  WHERE cr.type = 'client_admin' OR (
    cr.type IN ('client_nanny', 'nanny_client') AND 
    (b.id IS NOT NULL OR cr.type = 'client_admin')
  )
  ORDER BY latest_msg.created_at DESC NULLS LAST;
END;
$function$;