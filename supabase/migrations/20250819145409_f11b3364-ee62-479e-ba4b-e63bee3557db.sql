-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for document storage
CREATE POLICY "Admins can upload documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

CREATE POLICY "Nannies can view their own documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);