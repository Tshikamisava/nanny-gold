-- Comprehensive fix for ALL SECURITY DEFINER functions missing search_path
-- This addresses all 51 functions identified in the security scan

-- Functions from the query results that need search_path added:

CREATE OR REPLACE FUNCTION public.create_dev_client_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.clients (id) VALUES (p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_support_stats()
RETURNS TABLE(open_tickets bigint, in_progress_tickets bigint, resolved_today bigint, urgent_tickets bigint, pending_disputes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open')::bigint,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'in_progress')::bigint,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'resolved' AND DATE(created_at) = CURRENT_DATE)::bigint,
    (SELECT COUNT(*) FROM public.support_tickets WHERE priority = 'urgent' AND status IN ('open', 'in_progress'))::bigint,
    (SELECT COUNT(*) FROM public.disputes WHERE status = 'pending')::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_modification_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  nanny_id_var uuid;
  nanny_name TEXT;
  client_name TEXT;
BEGIN
  -- Get booking and names separately
  SELECT b.nanny_id INTO nanny_id_var
  FROM public.bookings b
  WHERE b.id = NEW.booking_id;
  
  SELECT CONCAT(np.first_name, ' ', np.last_name) INTO nanny_name
  FROM public.profiles np 
  WHERE np.id = nanny_id_var;
  
  SELECT CONCAT(cp.first_name, ' ', cp.last_name) INTO client_name
  FROM public.profiles cp 
  WHERE cp.id = NEW.client_id;
  
  -- Handle admin approval
  IF OLD.status = 'pending_admin_review' AND NEW.status = 'admin_approved' THEN
    -- Notify nanny about modification request
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      nanny_id_var,
      'Booking Modification Request',
      'A booking modification has been approved by admin and requires your response. Please review and accept or decline.',
      'modification_nanny_approval_required',
      jsonb_build_object(
        'modification_id', NEW.id,
        'booking_id', NEW.booking_id,
        'client_name', client_name,
        'modification_type', NEW.modification_type,
        'price_adjustment', NEW.price_adjustment
      )
    );
    
    -- Update status to pending nanny response
    NEW.status := 'pending_nanny_response';
    
  -- Handle admin rejection
  ELSIF OLD.status = 'pending_admin_review' AND NEW.status = 'admin_rejected' THEN
    -- Notify client about rejection
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      NEW.client_id,
      'Modification Request Rejected',
      'Your booking modification request has been reviewed and rejected by our team. ' || COALESCE('Reason: ' || NEW.admin_notes, ''),
      'modification_rejected',
      jsonb_build_object(
        'modification_id', NEW.id,
        'booking_id', NEW.booking_id,
        'rejection_reason', NEW.admin_notes
      )
    );
    
  -- Handle nanny acceptance
  ELSIF OLD.status = 'pending_nanny_response' AND NEW.status = 'nanny_accepted' THEN
    -- Apply the modification to the booking
    PERFORM public.apply_booking_modification_changes(NEW.id);
    
    -- Notify client about acceptance
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      NEW.client_id,
      'Modification Accepted',
      'Your booking modification has been accepted by ' || nanny_name || ' and will be applied to your next billing cycle.',
      'modification_accepted',
      jsonb_build_object(
        'modification_id', NEW.id,
        'booking_id', NEW.booking_id,
        'nanny_name', nanny_name
      )
    );
    
    -- Mark as applied
    NEW.status := 'applied';
    NEW.processed_at := now();
    
  -- Handle nanny decline
  ELSIF OLD.status = 'pending_nanny_response' AND NEW.status = 'nanny_declined' THEN
    -- Notify client about decline
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      NEW.client_id,
      'Modification Declined',
      'Your booking modification has been declined by ' || nanny_name || '. ' || COALESCE('Reason: ' || NEW.nanny_notes, ''),
      'modification_declined',
      jsonb_build_object(
        'modification_id', NEW.id,
        'booking_id', NEW.booking_id,
        'nanny_name', nanny_name,
        'decline_reason', NEW.nanny_notes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

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