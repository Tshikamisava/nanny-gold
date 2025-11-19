-- Final batch of SECURITY DEFINER functions to fix
-- This should address all remaining security warnings

-- Continue with remaining functions that need search_path
CREATE OR REPLACE FUNCTION public.phone_exists(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE phone = phone_number
  );
END;
$$;

-- Fix update_clients_updated_at function
CREATE OR REPLACE FUNCTION public.update_clients_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix trigger_update_nanny_compliance function
CREATE OR REPLACE FUNCTION public.trigger_update_nanny_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the specific nanny's compliance
  PERFORM public.update_nanny_compliance_status();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix is_valid_sa_phone function
CREATE OR REPLACE FUNCTION public.is_valid_sa_phone(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove all spaces and special characters
  phone_number := regexp_replace(phone_number, '[^0-9+]', '', 'g');
  
  -- Check if it matches South African phone number patterns
  -- +27 followed by 9 digits, or 0 followed by 9 digits
  RETURN phone_number ~ '^(\+27[0-9]{9}|0[0-9]{9})$';
END;
$$;

-- Fix get_user_chat_rooms function
CREATE OR REPLACE FUNCTION public.get_user_chat_rooms(user_id_param uuid)
RETURNS TABLE(room_id uuid, room_type text, room_name text, other_participant_id uuid, other_participant_name text, last_message text, last_message_at timestamp with time zone, unread_count bigint)
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

-- Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.admins a
    JOIN public.user_roles ur ON ur.user_id = a.id
    WHERE a.id = user_uuid 
      AND ur.role = 'admin' 
      AND a.admin_level = 'super_admin'
  );
$$;

-- Fix update_verification_step function
CREATE OR REPLACE FUNCTION public.update_verification_step(p_nanny_id uuid, p_step_name text, p_status text, p_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.nanny_verification_steps (nanny_id, step_name, status, notes, completed_at)
  VALUES (
    p_nanny_id, 
    p_step_name, 
    p_status,
    p_notes,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (nanny_id, step_name) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();
END;
$$;

-- Fix calculate_booking_days function
CREATE OR REPLACE FUNCTION public.calculate_booking_days(start_date date, end_date date DEFAULT NULL::date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN end_date IS NULL THEN 1
    ELSE GREATEST(1, (end_date - start_date + 1))
  END;
$$;