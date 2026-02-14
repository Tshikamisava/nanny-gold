-- Create storage buckets for documents and avatars
-- This migration creates the necessary storage buckets for file uploads

-- Create documents bucket (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket (public for profile pictures)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Create storage policies for documents bucket
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
CREATE POLICY "Admins can manage all nanny documents" ON public.nanny_documents
FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own documents" ON public.nanny_documents
FOR ALL USING (auth.uid() = nanny_id)
WITH CHECK (auth.uid() = nanny_id);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  ALTER TABLE public.nanny_documents 
  ADD CONSTRAINT nanny_documents_nanny_id_fkey 
  FOREIGN KEY (nanny_id) 
  REFERENCES public.nannies(id) 
  ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
