-- Fix chat room RLS policies to work with new admin escalation system
DROP POLICY IF EXISTS "Users can create messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

-- Create proper policies for chat rooms
CREATE POLICY "Users can create messages in rooms they participate in"
ON chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (
      SELECT 1 FROM chat_room_participants 
      WHERE room_id = chat_messages.room_id 
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view messages in rooms they participate in"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_room_participants 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid()
  )
);

-- Add policy for participants to view rooms
CREATE POLICY "Users can view their chat room participants"
ON chat_room_participants FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM chat_room_participants crp2 
    WHERE crp2.room_id = chat_room_participants.room_id 
    AND crp2.user_id = auth.uid()
  )
);

-- Add policy for creating participants (for admin escalation)
CREATE POLICY "System can create chat room participants"
ON chat_room_participants FOR INSERT
WITH CHECK (true);