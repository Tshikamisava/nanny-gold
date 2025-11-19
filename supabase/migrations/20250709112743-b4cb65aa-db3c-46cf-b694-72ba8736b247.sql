-- Add payment reference fields to clients table
ALTER TABLE public.clients 
ADD COLUMN payment_references TEXT[] DEFAULT '{}',
ADD COLUMN last_payment_reference TEXT;

-- Add updated_at trigger for clients table if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at_trigger
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clients_updated_at();