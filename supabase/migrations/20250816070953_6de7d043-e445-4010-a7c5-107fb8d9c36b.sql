-- Create booking modifications table
CREATE TABLE public.booking_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  modification_type TEXT NOT NULL CHECK (modification_type IN ('service_addition', 'service_removal', 'cancellation', 'date_change', 'schedule_change')),
  old_values JSONB,
  new_values JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  price_adjustment NUMERIC DEFAULT 0,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking modifications
ALTER TABLE public.booking_modifications ENABLE ROW LEVEL SECURITY;

-- Create policies for booking modifications
CREATE POLICY "Clients can view their booking modifications"
ON public.booking_modifications
FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can create booking modifications"
ON public.booking_modifications
FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their pending modifications"
ON public.booking_modifications
FOR UPDATE
USING (auth.uid() = client_id AND status = 'pending');

CREATE POLICY "Admins can manage all booking modifications"
ON public.booking_modifications
FOR ALL
USING (is_admin());

-- Create booking billing adjustments table
CREATE TABLE public.booking_billing_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  modification_id UUID REFERENCES public.booking_modifications(id) ON DELETE CASCADE,
  adjustment_amount NUMERIC NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('service_addition', 'service_removal', 'proration', 'cancellation_fee')),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on billing adjustments
ALTER TABLE public.booking_billing_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for billing adjustments
CREATE POLICY "Users can view billing adjustments for their bookings"
ON public.booking_billing_adjustments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings 
  WHERE bookings.id = booking_billing_adjustments.booking_id 
  AND (bookings.client_id = auth.uid() OR bookings.nanny_id = auth.uid())
));

CREATE POLICY "Admins can manage all billing adjustments"
ON public.booking_billing_adjustments
FOR ALL
USING (is_admin());

-- Create function to calculate service price adjustments
CREATE OR REPLACE FUNCTION public.calculate_service_adjustment(
  p_booking_id UUID,
  p_service_type TEXT,
  p_is_addition BOOLEAN,
  p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_rate NUMERIC;
  v_adjustment NUMERIC := 0;
  v_days_remaining INTEGER;
  v_booking_end_date DATE;
BEGIN
  -- Get booking details
  SELECT base_rate, end_date INTO v_base_rate, v_booking_end_date
  FROM public.bookings
  WHERE id = p_booking_id;
  
  -- Calculate days remaining in current billing period
  v_days_remaining := EXTRACT(days FROM (COALESCE(v_booking_end_date, p_effective_date + INTERVAL '30 days') - p_effective_date));
  
  -- Service pricing (monthly rates)
  CASE p_service_type
    WHEN 'cooking' THEN v_adjustment := 800;
    WHEN 'driving_support' THEN v_adjustment := 600;
    WHEN 'light_house_keeping' THEN v_adjustment := 500;
    WHEN 'pet_care' THEN v_adjustment := 300;
    WHEN 'special_needs' THEN v_adjustment := 1200;
    ELSE v_adjustment := 0;
  END CASE;
  
  -- Prorate for remaining days
  v_adjustment := v_adjustment * (v_days_remaining / 30.0);
  
  -- Make negative if removal
  IF NOT p_is_addition THEN
    v_adjustment := -v_adjustment;
  END IF;
  
  RETURN v_adjustment;
END;
$$;

-- Create trigger to update booking costs when modifications are applied
CREATE OR REPLACE FUNCTION public.apply_booking_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_record public.bookings%ROWTYPE;
  v_new_services JSONB;
  v_new_total NUMERIC;
BEGIN
  -- Only process when status changes to 'applied'
  IF OLD.status != 'applied' AND NEW.status = 'applied' THEN
    -- Get current booking
    SELECT * INTO v_booking_record FROM public.bookings WHERE id = NEW.booking_id;
    
    -- Apply service modifications
    IF NEW.modification_type = 'service_addition' THEN
      v_new_services := COALESCE(v_booking_record.services, '{}'::jsonb) || NEW.new_values;
    ELSIF NEW.modification_type = 'service_removal' THEN
      v_new_services := v_booking_record.services - (NEW.old_values->>'service_type');
    ELSE
      v_new_services := v_booking_record.services;
    END IF;
    
    -- Calculate new total
    v_new_total := v_booking_record.base_rate + 
                   COALESCE(v_booking_record.additional_services_cost, 0) + 
                   COALESCE(NEW.price_adjustment, 0);
    
    -- Update booking
    UPDATE public.bookings 
    SET 
      services = v_new_services,
      additional_services_cost = COALESCE(additional_services_cost, 0) + COALESCE(NEW.price_adjustment, 0),
      total_monthly_cost = v_new_total,
      updated_at = now()
    WHERE id = NEW.booking_id;
    
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
      NEW.booking_id,
      NEW.id,
      NEW.price_adjustment,
      NEW.modification_type,
      COALESCE(NEW.effective_date, CURRENT_DATE),
      COALESCE(NEW.effective_date, CURRENT_DATE) + INTERVAL '30 days',
      CASE 
        WHEN NEW.modification_type = 'service_addition' THEN 'Added service: ' || (NEW.new_values->>'service_type')
        WHEN NEW.modification_type = 'service_removal' THEN 'Removed service: ' || (NEW.old_values->>'service_type')
        ELSE 'Booking modification'
      END
    );
    
    -- Notify client about applied changes
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      NEW.client_id,
      'Booking Modification Applied',
      'Your booking modification has been processed and will be reflected in your next billing cycle.',
      'booking_modification_applied',
      jsonb_build_object(
        'booking_id', NEW.booking_id,
        'modification_id', NEW.id,
        'price_adjustment', NEW.price_adjustment
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for booking modifications
CREATE TRIGGER apply_booking_modification_trigger
  AFTER UPDATE ON public.booking_modifications
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_booking_modification();

-- Create updated_at trigger for booking modifications
CREATE TRIGGER booking_modifications_updated_at
  BEFORE UPDATE ON public.booking_modifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();