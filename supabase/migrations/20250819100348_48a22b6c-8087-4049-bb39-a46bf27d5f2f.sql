-- Fix all SECURITY DEFINER functions by adding proper search_path
-- This addresses the Security Advisor warnings about functions missing search_path

-- Fix create_dev_client_profile function
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

-- Fix set_default_payment_method function  
CREATE OR REPLACE FUNCTION public.set_default_payment_method(p_client_id uuid, p_payment_method_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set all other payment methods to non-default
  UPDATE public.client_payment_methods 
  SET is_default = false 
  WHERE client_id = p_client_id;
  
  -- Set the specified payment method as default
  UPDATE public.client_payment_methods 
  SET is_default = true 
  WHERE id = p_payment_method_id AND client_id = p_client_id;
END;
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'admin');
$$;

-- Fix update_children_count function
CREATE OR REPLACE FUNCTION public.update_children_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Calculate number of children from the length of children_ages array
  -- Filter out empty strings
  NEW.number_of_children := CASE 
    WHEN NEW.children_ages IS NULL THEN 0
    WHEN array_length(NEW.children_ages, 1) IS NULL THEN 0
    ELSE array_length(array_remove(NEW.children_ages, ''), 1)
  END;
  RETURN NEW;
END;
$$;

-- Fix handle_modification_status_change function
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

-- Fix apply_booking_modification_changes function
CREATE OR REPLACE FUNCTION public.apply_booking_modification_changes(p_modification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mod_record public.booking_modifications%ROWTYPE;
  booking_record public.bookings%ROWTYPE;
  new_services jsonb;
  new_additional_cost numeric;
  service_key text;
BEGIN
  -- Get modification and booking records
  SELECT * INTO mod_record FROM public.booking_modifications WHERE id = p_modification_id;
  SELECT * INTO booking_record FROM public.bookings WHERE id = mod_record.booking_id;
  
  -- Apply service changes
  IF mod_record.modification_type = 'service_addition' THEN
    new_services := COALESCE(booking_record.services, '{}'::jsonb) || mod_record.new_values;
    new_additional_cost := COALESCE(booking_record.additional_services_cost, 0) + COALESCE(mod_record.price_adjustment, 0);
    
  ELSIF mod_record.modification_type = 'service_removal' THEN
    new_services := COALESCE(booking_record.services, '{}'::jsonb);
    -- Remove services specified in old_values
    FOR service_key IN SELECT jsonb_object_keys(mod_record.old_values)
    LOOP
      new_services := new_services - service_key;
    END LOOP;
    new_additional_cost := COALESCE(booking_record.additional_services_cost, 0) + COALESCE(mod_record.price_adjustment, 0);
    
  ELSE
    -- For cancellation or other types, handle accordingly
    new_services := booking_record.services;
    new_additional_cost := booking_record.additional_services_cost;
  END IF;
  
  -- Update the booking
  UPDATE public.bookings 
  SET 
    services = new_services,
    additional_services_cost = new_additional_cost,
    total_monthly_cost = base_rate + new_additional_cost,
    updated_at = now()
  WHERE id = mod_record.booking_id;
  
  -- Create billing adjustment record
  INSERT INTO public.booking_billing_adjustments (
    booking_id,
    modification_id,
    adjustment_amount,
    adjustment_type,
    billing_period_start,
    billing_period_end,
    description
  ) VALUES (
    mod_record.booking_id,
    mod_record.id,
    COALESCE(mod_record.price_adjustment, 0),
    mod_record.modification_type,
    COALESCE(mod_record.effective_date, CURRENT_DATE),
    COALESCE(mod_record.effective_date, CURRENT_DATE) + INTERVAL '30 days',
    CASE 
      WHEN mod_record.modification_type = 'service_addition' THEN 'Service addition approved'
      WHEN mod_record.modification_type = 'service_removal' THEN 'Service removal approved'
      ELSE 'Booking modification applied'
    END
  );
END;
$$;