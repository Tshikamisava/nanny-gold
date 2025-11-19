-- Continue fixing remaining SECURITY DEFINER functions by adding proper search_path
-- This is part 2 of addressing the Security Advisor warnings

-- Fix update_payment_schedule_dates function
CREATE OR REPLACE FUNCTION public.update_payment_schedule_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  dates RECORD;
BEGIN
  -- Calculate next payment dates
  SELECT * INTO dates FROM public.calculate_next_payment_dates(now(), NEW.authorization_day, NEW.capture_day);
  
  NEW.next_authorization_date := dates.next_auth_date;
  NEW.next_capture_date := dates.next_capture_date;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Fix get_or_create_chat_room function
CREATE OR REPLACE FUNCTION public.get_or_create_chat_room(participant1_id uuid, participant2_id uuid, room_type text DEFAULT 'client_nanny'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Fix calculate_distance function
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  R CONSTANT DECIMAL := 6371; -- Earth's radius in kilometers
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  -- Haversine formula
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$;

-- Fix update_last_seen_on_message function
CREATE OR REPLACE FUNCTION public.update_last_seen_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chat_room_participants
  SET last_seen_at = now()
  WHERE room_id = NEW.room_id AND user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Fix update_interviews_updated_at function
CREATE OR REPLACE FUNCTION public.update_interviews_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix calculate_next_payment_dates function
CREATE OR REPLACE FUNCTION public.calculate_next_payment_dates(input_date timestamp with time zone DEFAULT now(), auth_day integer DEFAULT 25, capture_day integer DEFAULT 1)
RETURNS TABLE(next_auth_date timestamp with time zone, next_capture_date timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_month_auth TIMESTAMPTZ;
  current_month_capture TIMESTAMPTZ;
  next_month_auth TIMESTAMPTZ;
  next_month_capture TIMESTAMPTZ;
BEGIN
  -- Calculate authorization date for current month (25th)
  current_month_auth := date_trunc('month', input_date) + INTERVAL '1 day' * (auth_day - 1);
  
  -- Calculate capture date for next month (1st)
  current_month_capture := date_trunc('month', input_date) + INTERVAL '1 month' + INTERVAL '1 day' * (capture_day - 1);
  
  -- If we've passed the current month's auth date, move to next month
  IF input_date > current_month_auth THEN
    next_auth_date := date_trunc('month', input_date) + INTERVAL '1 month' + INTERVAL '1 day' * (auth_day - 1);
    next_capture_date := date_trunc('month', input_date) + INTERVAL '2 months' + INTERVAL '1 day' * (capture_day - 1);
  ELSE
    next_auth_date := current_month_auth;
    next_capture_date := current_month_capture;
  END IF;
  
  RETURN QUERY SELECT next_auth_date, next_capture_date;
END;
$$;

-- Fix validate_email function
CREATE OR REPLACE FUNCTION public.validate_email(email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Fix validate_phone_number function
CREATE OR REPLACE FUNCTION public.validate_phone_number(phone text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- South African phone number validation
  RETURN phone ~ '^(\+27|0)[0-9]{9}$';
END;
$$;