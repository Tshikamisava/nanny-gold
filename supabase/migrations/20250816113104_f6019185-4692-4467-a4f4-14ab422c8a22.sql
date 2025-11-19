-- Create chat rooms table for direct conversations
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('client_admin', 'client_nanny', 'group')),
  name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat room participants table
CREATE TABLE public.chat_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enhance existing chat_messages table to work with new room system
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system'));
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id);

-- Enable RLS on new tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in" 
ON public.chat_rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create rooms" 
ON public.chat_rooms FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- RLS policies for chat_room_participants
CREATE POLICY "Users can view participants in their rooms" 
ON public.chat_room_participants FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.chat_room_participants crp 
    WHERE crp.room_id = chat_room_participants.room_id AND crp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join rooms" 
ON public.chat_room_participants FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.chat_rooms 
    WHERE id = room_id AND created_by = auth.uid()
  )
);

-- Function to create or get chat room between two users
CREATE OR REPLACE FUNCTION public.get_or_create_chat_room(
  participant1_id UUID,
  participant2_id UUID,
  room_type TEXT DEFAULT 'client_nanny'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  room_id UUID;
BEGIN
  -- Check if room already exists between these two users
  SELECT cr.id INTO room_id
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
      WHERE room_id = cr.id
    ) = 2;
  
  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO public.chat_rooms (type, created_by)
    VALUES (room_type, participant1_id)
    RETURNING id INTO room_id;
    
    -- Add both participants
    INSERT INTO public.chat_room_participants (room_id, user_id)
    VALUES (room_id, participant1_id), (room_id, participant2_id);
  END IF;
  
  RETURN room_id;
END;
$$;

-- Function to get chat rooms for a user
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
    other_p.user_id as other_participant_id,
    CONCAT(p.first_name, ' ', p.last_name) as other_participant_name,
    COALESCE(latest_msg.content, 'No messages yet') as last_message,
    latest_msg.created_at as last_message_at,
    COALESCE(unread.count, 0) as unread_count
  FROM public.chat_rooms cr
  JOIN public.chat_room_participants my_p ON my_p.room_id = cr.id AND my_p.user_id = user_id_param
  LEFT JOIN public.chat_room_participants other_p ON other_p.room_id = cr.id AND other_p.user_id != user_id_param
  LEFT JOIN public.profiles p ON p.id = other_p.user_id
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
      AND created_at > COALESCE(my_p.last_seen_at, '1970-01-01'::timestamp)
      AND sender_id != user_id_param
  ) unread ON true
  ORDER BY latest_msg.created_at DESC NULLS LAST;
END;
$$;

-- Trigger to update last_seen_at when user sends message
CREATE OR REPLACE FUNCTION public.update_last_seen_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.chat_room_participants
  SET last_seen_at = now()
  WHERE room_id = NEW.room_id AND user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_last_seen_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_seen_on_message();