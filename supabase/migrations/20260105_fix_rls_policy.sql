-- Update RLS policy to allow authenticated users to upload documents
BEGIN;

-- Ensure authenticated users can insert rows into the avatars bucket
CREATE POLICY "Authenticated can insert avatars"
ON storage.objects
FOR INSERT
USING (auth.uid() IS NOT NULL AND bucket_id = 'avatars');

COMMIT;