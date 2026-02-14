-- Fix storage policies for document uploads
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create simplified storage policies for documents bucket
CREATE POLICY "Admins can manage all documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' AND is_admin()
);

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

-- Also fix nanny_documents table policies
DROP POLICY IF EXISTS "Admins can manage all nanny documents" ON public.nanny_documents;
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.nanny_documents;
DROP POLICY IF EXISTS "System can insert documents" ON public.nanny_documents;

CREATE POLICY "Admins can manage all nanny documents" ON public.nanny_documents
FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own documents" ON public.nanny_documents
FOR ALL USING (auth.uid() = nanny_id)
WITH CHECK (auth.uid() = nanny_id);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
