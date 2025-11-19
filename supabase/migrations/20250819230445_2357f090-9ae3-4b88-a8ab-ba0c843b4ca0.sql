-- Check if chat_room_participants table exists and create if missing
CREATE TABLE IF NOT EXISTS public.chat_room_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_room_participants
CREATE POLICY IF NOT EXISTS "Users can view room participants for their rooms" 
ON public.chat_room_participants 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants crp 
    WHERE crp.room_id = chat_room_participants.room_id AND crp.user_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY IF NOT EXISTS "Users can insert themselves as participants" 
ON public.chat_room_participants 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY IF NOT EXISTS "Users can update their own participation" 
ON public.chat_room_participants 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR is_admin());

-- Fix the get_or_create_chat_room function with fully qualified column names
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
      SELECT COUNT(*) FROM public.chat_room_participants crp_count
      WHERE crp_count.room_id = cr.id
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