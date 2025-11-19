-- Create sequences for invoice and advice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS payment_advice_sequence START 1;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('invoice_sequence')::text, 4, '0');
END;
$$;

-- Function to generate payment advice numbers  
CREATE OR REPLACE FUNCTION generate_advice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'PA-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('payment_advice_sequence')::text, 4, '0');
END;
$$;