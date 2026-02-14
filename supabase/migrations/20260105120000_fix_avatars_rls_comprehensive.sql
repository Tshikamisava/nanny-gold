-- Comprehensive fix for avatars bucket RLS policies
-- This migration removes all conflicting policies and creates clean, working ones

BEGIN;

-- Step 1: Drop ALL existing policies for the avatars bucket to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can access avatars" ON storage.objects;

-- Step 2: Ensure the avatars bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 3: Create new, clean policies for avatars bucket

-- Allow anyone to view avatars (public read access)
CREATE POLICY "avatars_public_read" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to insert avatars into their own folder
CREATE POLICY "avatars_authenticated_insert" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow uploads to user's own folder (e.g., {user_id}/avatar.jpg)
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR
    -- Also allow uploads without folder structure for backward compatibility
    auth.uid() IS NOT NULL
  )
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "avatars_authenticated_update" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR is_admin()
  )
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "avatars_authenticated_delete" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR is_admin()
  )
);

-- Allow admins to manage all avatars
CREATE POLICY "avatars_admin_all" ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND is_admin()
);

COMMIT;
