-- Temporarily disable RLS on support_chat_messages for system inserts
-- We'll create a function that can be called by the edge function instead

-- Create a function that can insert system messages (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_system_chat_message(
  p_ticket_id UUID,
  p_message TEXT,
  p_is_internal BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO public.support_chat_messages (
    ticket_id,
    sender_id,
    message,
    is_internal
  ) VALUES (
    p_ticket_id,
    'system',
    p_message,
    p_is_internal
  ) RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_system_chat_message(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_system_chat_message(UUID, TEXT, BOOLEAN) TO service_role;