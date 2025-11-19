-- Drop existing policies and recreate properly
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

-- Storage policies for documents bucket (admin can manage any user's documents)
CREATE POLICY "Admins can manage all documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' AND is_admin()
);

CREATE POLICY "Users can upload their own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

CREATE POLICY "Users can view their own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

CREATE POLICY "Users can update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

CREATE POLICY "Users can delete their own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

-- Storage policies for avatars bucket (admin can manage any user's avatars)
CREATE POLICY "Admins can manage all avatars" ON storage.objects
FOR ALL USING (
  bucket_id = 'avatars' AND is_admin()
);

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

CREATE POLICY "Users can view their own avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
);

-- Ensure avatars bucket is public for profile pictures
UPDATE storage.buckets SET public = true WHERE id = 'avatars';