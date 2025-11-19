-- Fix security issues: Add search_path to functions
DROP FUNCTION IF EXISTS public.generate_invoice_number();
DROP FUNCTION IF EXISTS public.generate_advice_number();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ '^INV-\d+$';
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_advice_number()
RETURNS TEXT
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number INTEGER;
  advice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(advice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.nanny_payment_advice
  WHERE advice_number ~ '^ADV-\d+$';
  
  advice_num := 'ADV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN advice_num;
END;
$$;