-- Continue fixing remaining SECURITY DEFINER functions - Batch 2

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

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'admin');
$$;

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