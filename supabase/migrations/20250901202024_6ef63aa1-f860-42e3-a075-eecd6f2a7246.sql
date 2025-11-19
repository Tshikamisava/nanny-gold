-- Fix all storage bucket and database permissions for uploads

-- 1. Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false), ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create nanny_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.nanny_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nanny_id uuid NOT NULL,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  verification_status text DEFAULT 'pending',
  upload_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Enable RLS on nanny_documents
ALTER TABLE public.nanny_documents ENABLE ROW LEVEL SECURITY;

-- 4. Storage policies for documents bucket
CREATE POLICY "Admins can manage all documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' AND is_admin()
);

CREATE POLICY "Users can upload their own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Storage policies for avatars bucket  
CREATE POLICY "Admins can manage all avatars" ON storage.objects
FOR ALL USING (
  bucket_id = 'avatars' AND is_admin()
);

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Database policies for nanny_documents
CREATE POLICY "Admins can manage all nanny documents" ON public.nanny_documents
FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own documents" ON public.nanny_documents
FOR ALL USING (auth.uid() = nanny_id)
WITH CHECK (auth.uid() = nanny_id);

CREATE POLICY "System can insert documents" ON public.nanny_documents
FOR INSERT WITH CHECK (true);