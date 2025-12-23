-- Create trigger function to notify nannies when bookings are created
CREATE OR REPLACE FUNCTION notify_nanny_on_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_booking_type_text TEXT;
BEGIN
  -- Only notify for new bookings (INSERT), not updates
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_client_name
  FROM public.profiles p
  WHERE p.id = NEW.client_id;

  -- Determine booking type text
  CASE NEW.booking_type
    WHEN 'long_term' THEN v_booking_type_text := 'long-term';
    WHEN 'short_term_hourly' THEN v_booking_type_text := 'hourly';
    WHEN 'short_term_daily' THEN v_booking_type_text := 'daily';
    ELSE v_booking_type_text := 'new';
  END CASE;

  -- Create notification for nanny
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data,
    created_at
  ) VALUES (
    NEW.nanny_id,
    'New Booking Request',
    v_client_name || ' has submitted a ' || v_booking_type_text || ' booking request. Please review and respond.',
    'booking_request',
    jsonb_build_object(
      'booking_id', NEW.id,
      'client_id', NEW.client_id,
      'client_name', v_client_name,
      'booking_type', NEW.booking_type,
      'status', NEW.status
    ),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the booking creation
    RAISE WARNING 'Error creating notification for booking %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS notify_nanny_on_booking_created_trigger ON public.bookings;
CREATE TRIGGER notify_nanny_on_booking_created_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_nanny_on_booking_created();

-- Add comment
COMMENT ON TRIGGER notify_nanny_on_booking_created_trigger ON public.bookings IS
'Automatically creates a notification for nannies when clients create new booking requests.';