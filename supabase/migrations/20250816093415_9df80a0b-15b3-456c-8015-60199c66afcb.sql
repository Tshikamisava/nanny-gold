-- Update booking_modifications table to support proper workflow
ALTER TABLE public.booking_modifications 
ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS nanny_responded_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS nanny_responded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS nanny_notes text;

-- Create function to handle modification workflow status updates
CREATE OR REPLACE FUNCTION public.handle_modification_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  booking_record public.bookings%ROWTYPE;
  nanny_name TEXT;
  client_name TEXT;
BEGIN
  -- Get booking details
  SELECT b.*, 
         CONCAT(np.first_name, ' ', np.last_name) as nanny_full_name,
         CONCAT(cp.first_name, ' ', cp.last_name) as client_full_name
  INTO booking_record, nanny_name, client_name
  FROM public.bookings b
  JOIN public.profiles np ON b.nanny_id = np.id
  JOIN public.profiles cp ON b.client_id = cp.id
  WHERE b.id = NEW.booking_id;
  
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
      booking_record.nanny_id,
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

-- Create function to apply modification changes to booking
CREATE OR REPLACE FUNCTION public.apply_booking_modification_changes(p_modification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  mod_record public.booking_modifications%ROWTYPE;
  booking_record public.bookings%ROWTYPE;
  new_services jsonb;
  new_additional_cost numeric;
BEGIN
  -- Get modification and booking records
  SELECT * INTO mod_record FROM public.booking_modifications WHERE id = p_modification_id;
  SELECT * INTO booking_record FROM public.bookings WHERE id = mod_record.booking_id;
  
  -- Apply service changes
  IF mod_record.modification_type = 'service_addition' THEN
    new_services := COALESCE(booking_record.services, '{}'::jsonb) || mod_record.new_values;
    new_additional_cost := COALESCE(booking_record.additional_services_cost, 0) + COALESCE(mod_record.price_adjustment, 0);
    
  ELSIF mod_record.modification_type = 'service_removal' THEN
    new_services := booking_record.services;
    -- Remove services specified in old_values
    FOR key IN SELECT jsonb_object_keys(mod_record.old_values)
    LOOP
      new_services := new_services - key;
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
    mod_record.price_adjustment,
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

-- Create trigger for modification status changes
CREATE TRIGGER on_modification_status_change
  BEFORE UPDATE ON public.booking_modifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_modification_status_change();

-- Update RLS policies for modification workflow
DROP POLICY IF EXISTS "Users can view their modification requests" ON public.booking_modifications;
DROP POLICY IF EXISTS "Users can create modification requests" ON public.booking_modifications;
DROP POLICY IF EXISTS "Admins can manage modifications" ON public.booking_modifications;

CREATE POLICY "Users can view their modification requests" 
ON public.booking_modifications 
FOR SELECT 
USING (
  client_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id AND b.nanny_id = auth.uid()
  ) OR
  is_admin()
);

CREATE POLICY "Clients can create modification requests" 
ON public.booking_modifications 
FOR INSERT 
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update modification status for review" 
ON public.booking_modifications 
FOR UPDATE 
USING (is_admin() AND status IN ('pending_admin_review', 'admin_approved', 'admin_rejected'));

CREATE POLICY "Nannies can respond to approved modifications" 
ON public.booking_modifications 
FOR UPDATE 
USING (
  status = 'pending_nanny_response' AND
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id AND b.nanny_id = auth.uid()
  )
);