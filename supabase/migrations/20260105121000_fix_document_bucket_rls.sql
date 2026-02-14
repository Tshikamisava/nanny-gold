-- Comprehensive fix for document bucket RLS policies
-- This migration creates policies for both 'document' and 'documents' buckets

BEGIN;

-- Step 1: Drop ALL existing policies for document/documents buckets to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- Step 2: Ensure both document buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document', 'document', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Step 3: Create policies for 'document' bucket (singular)

-- Allow authenticated users to insert documents into their own folder
CREATE POLICY "document_authenticated_insert" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  (bucket_id = 'document' OR bucket_id = 'documents')
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow uploads to user's own folder (e.g., {user_id}/file.pdf)
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR
    -- Also allow uploads without strict folder matching
    auth.uid() IS NOT NULL
  )
);

-- Allow authenticated users to view their own documents
CREATE POLICY "document_authenticated_select" ON storage.objects
FOR SELECT 
TO authenticated
USING (
  (bucket_id = 'document' OR bucket_id = 'documents')
  AND (
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR is_admin()
  )
);

-- Allow authenticated users to update their own documents
CREATE POLICY "document_authenticated_update" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  (bucket_id = 'document' OR bucket_id = 'documents')
  AND (
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR is_admin()
  )
);

-- Allow authenticated users to delete their own documents
CREATE POLICY "document_authenticated_delete" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  (bucket_id = 'document' OR bucket_id = 'documents')
  AND (
    (storage.foldername(name))[1]::uuid = auth.uid()
    OR is_admin()
  )
);

-- Allow admins to manage all documents
CREATE POLICY "document_admin_all" ON storage.objects
FOR ALL
TO authenticated
USING (
  (bucket_id = 'document' OR bucket_id = 'documents') AND is_admin()
);

COMMIT;
