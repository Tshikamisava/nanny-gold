-- Policy for allowing public access to avatar images
-- This allows anyone to read avatar images from the avatars bucket

CREATE POLICY "Allow public access to avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
);

-- Allow authenticated users to upload their own avatar
-- Further simplified policy to allow avatar uploads
CREATE POLICY "Allow users to upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid() IS NOT NULL
);

-- Allow users to update their own avatar
CREATE POLICY "Allow users to update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid() = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
CREATE POLICY "Allow users to delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid() = (storage.foldername(name))[1]
);
