-- Fix chat room participants table - ensure clean creation
-- First, drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS public.chat_room_participants CASCADE;

-- Create chat_room_participants table with proper structure
CREATE TABLE public.chat_room_participants (
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

-- Create RLS policies for chat_room_participants
CREATE POLICY "Users can view room participants for their rooms" 
ON public.chat_room_participants 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants crp 
    WHERE crp.room_id = chat_room_participants.room_id AND crp.user_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Users can insert themselves as participants" 
ON public.chat_room_participants 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update their own participation" 
ON public.chat_room_participants 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR is_admin());