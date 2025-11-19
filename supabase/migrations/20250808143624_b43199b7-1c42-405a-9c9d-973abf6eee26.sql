-- Create RPC function to get chat messages
CREATE OR REPLACE FUNCTION public.get_chat_messages(room_id_param uuid)
RETURNS TABLE(
  id uuid,
  content text,
  sender_id uuid,
  sender_name text,
  sender_type text,
  created_at timestamp with time zone,
  room_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.content,
    cm.sender_id,
    cm.sender_name,
    cm.sender_type,
    cm.created_at,
    cm.room_id
  FROM public.chat_messages cm
  WHERE cm.room_id = room_id_param
  ORDER BY cm.created_at ASC;
END;
$$;

-- Create RPC function to send chat messages
CREATE OR REPLACE FUNCTION public.send_chat_message(
  room_id_param uuid,
  content_param text,
  sender_name_param text,
  sender_type_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_id uuid;
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
  )
  RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$;