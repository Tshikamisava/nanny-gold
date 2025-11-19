-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false);

-- Create payment_proofs table
CREATE TABLE public.payment_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  proof_file_url TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID NULL,
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_proofs table
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_proofs table
CREATE POLICY "Clients can insert their own payment proofs"
ON public.payment_proofs
FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own payment proofs"
ON public.payment_proofs
FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all payment proofs"
ON public.payment_proofs
FOR ALL
USING (is_admin());

-- Storage policies for payment-proofs bucket
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all payment proofs in storage"
ON storage.objects
FOR ALL
USING (bucket_id = 'payment-proofs' AND is_admin());