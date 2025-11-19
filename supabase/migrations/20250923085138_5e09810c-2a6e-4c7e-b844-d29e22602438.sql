-- Create storage bucket for payment proofs (ignore if exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

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