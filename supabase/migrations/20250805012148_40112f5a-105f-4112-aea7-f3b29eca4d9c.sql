-- Create tables for client payment methods and payment tracking
CREATE TABLE IF NOT EXISTS public.client_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_authorization_code TEXT NOT NULL,
  card_type TEXT NOT NULL,
  last_four TEXT NOT NULL,
  exp_month TEXT NOT NULL,
  exp_year TEXT NOT NULL,
  bank TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for client invoice notifications
CREATE TABLE IF NOT EXISTS public.client_invoice_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  payment_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for nanny payment advice notifications
CREATE TABLE IF NOT EXISTS public.nanny_payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_advice_id UUID NOT NULL REFERENCES public.nanny_payment_advice(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoice_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nanny_payment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client payment methods
CREATE POLICY "Clients can view their payment methods" ON public.client_payment_methods
FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their payment methods" ON public.client_payment_methods
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their payment methods" ON public.client_payment_methods
FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their payment methods" ON public.client_payment_methods
FOR DELETE USING (auth.uid() = client_id);

-- RLS Policies for client invoice notifications
CREATE POLICY "Clients can view their invoice notifications" ON public.client_invoice_notifications
FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "System can create invoice notifications" ON public.client_invoice_notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Clients can update their invoice notifications" ON public.client_invoice_notifications
FOR UPDATE USING (auth.uid() = client_id);

-- RLS Policies for nanny payment notifications
CREATE POLICY "Nannies can view their payment notifications" ON public.nanny_payment_notifications
FOR SELECT USING (auth.uid() = nanny_id);

CREATE POLICY "System can create payment notifications" ON public.nanny_payment_notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Nannies can update their payment notifications" ON public.nanny_payment_notifications
FOR UPDATE USING (auth.uid() = nanny_id);

-- Function to automatically set default payment method
CREATE OR REPLACE FUNCTION public.set_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first payment method, make it default
  IF NEW.is_default = false THEN
    PERFORM 1 FROM public.client_payment_methods 
    WHERE client_id = NEW.client_id AND id != NEW.id;
    
    IF NOT FOUND THEN
      NEW.is_default = true;
    END IF;
  END IF;
  
  -- If setting as default, unset others
  IF NEW.is_default = true THEN
    UPDATE public.client_payment_methods 
    SET is_default = false 
    WHERE client_id = NEW.client_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for default payment method
CREATE TRIGGER trigger_set_default_payment_method
  BEFORE INSERT OR UPDATE ON public.client_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_default_payment_method();

-- Function to notify clients when invoice is generated
CREATE OR REPLACE FUNCTION public.notify_client_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification record
  INSERT INTO public.client_invoice_notifications (client_id, invoice_id)
  VALUES (NEW.client_id, NEW.id);
  
  -- Create system notification
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    NEW.client_id,
    'New Invoice Generated',
    'A new invoice ' || NEW.invoice_number || ' has been generated for your account.',
    'invoice_generated',
    jsonb_build_object(
      'invoice_id', NEW.id,
      'invoice_number', NEW.invoice_number,
      'amount', NEW.amount,
      'due_date', NEW.due_date
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for invoice notifications
CREATE TRIGGER trigger_notify_client_invoice
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_invoice();

-- Function to notify nannies when payment advice is created
CREATE OR REPLACE FUNCTION public.notify_nanny_payment_advice()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification record
  INSERT INTO public.nanny_payment_notifications (nanny_id, payment_advice_id)
  VALUES (NEW.nanny_id, NEW.id);
  
  -- Create system notification
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    NEW.nanny_id,
    'Payment Advice Available',
    'Payment advice ' || NEW.advice_number || ' is now available for download.',
    'payment_advice_generated',
    jsonb_build_object(
      'advice_id', NEW.id,
      'advice_number', NEW.advice_number,
      'net_amount', NEW.net_amount,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment advice notifications
CREATE TRIGGER trigger_notify_nanny_payment_advice
  AFTER INSERT ON public.nanny_payment_advice
  FOR EACH ROW EXECUTE FUNCTION public.notify_nanny_payment_advice();