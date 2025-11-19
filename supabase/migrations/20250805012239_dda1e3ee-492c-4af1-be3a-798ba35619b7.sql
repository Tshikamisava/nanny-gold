-- Fix security issues by updating functions with proper search paths
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix other functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;