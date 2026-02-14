-- Direct SQL to create storage buckets and policies
-- Run this in the Supabase SQL Editor

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false), ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;

CREATE POLICY "Users can upload their own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Users can view their own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Users can update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Users can delete their own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Admins can manage all documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' AND is_admin()
);

-- Create storage policies for avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all avatars" ON storage.objects;

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Users can view their own avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Admins can manage all avatars" ON storage.objects
FOR ALL USING (
  bucket_id = 'avatars' AND is_admin()
);

-- Grant permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Create nanny_documents table if it doesn't exist
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

-- Enable RLS on nanny_documents
ALTER TABLE public.nanny_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for nanny_documents
DROP POLICY IF EXISTS "Admins can manage all nanny documents" ON public.nanny_documents;
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.nanny_documents;

CREATE POLICY "Admins can manage all nanny documents" ON public.nanny_documents
FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own documents" ON public.nanny_documents
FOR ALL USING (auth.uid() = nanny_id)
WITH CHECK (auth.uid() = nanny_id);
