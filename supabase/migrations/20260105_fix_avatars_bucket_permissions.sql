-- Ensure the avatars bucket has public read access
BEGIN;

-- Update bucket permissions for avatars
UPDATE storage.buckets
SET public = true
WHERE name = 'avatars';

-- Ensure RLS policies allow public access to avatars
CREATE POLICY "Public can access avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

COMMIT;