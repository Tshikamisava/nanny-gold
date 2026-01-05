# Fix Document Upload Issue

## Problem
The document upload functionality is not working because the storage buckets (`documents` and `avatars`) don't exist in your Supabase project.

## Solution

### Option 1: Quick Fix (Recommended)

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project `msawldkygbsipjmjuyue`

2. **Run the SQL Script**
   - Navigate to **SQL Editor** in the left sidebar
   - Click **New query**
   - Copy and paste the contents of `create-buckets-direct.sql` file
   - Click **Run** to execute the script

3. **Verify the Fix**
   - The script will create:
     - `documents` bucket (private) for document uploads
     - `avatars` bucket (public) for profile pictures
     - Proper storage policies for user access
     - `nanny_documents` table if it doesn't exist

### Option 2: Manual Setup

If the SQL script doesn't work, you can create the buckets manually:

1. **Create Buckets in Dashboard**
   - Go to **Storage** in the Supabase Dashboard
   - Click **New bucket**
   - Create `documents` bucket (public: false)
   - Create `avatars` bucket (public: true)

2. **Set Up Policies**
   - For each bucket, go to **Policies**
   - Add policies allowing users to manage their own files
   - Use the SQL script as reference for the exact policy definitions

## What the Fix Does

The SQL script creates:

### Storage Buckets
- **documents**: Private bucket for nanny documents (PDFs, images, etc.)
- **avatars**: Public bucket for profile pictures

### Storage Policies
- Users can upload/view/update/delete their own files
- Admins can manage all files
- Proper folder structure: `{user_id}/{filename}`

### Database Table
- `nanny_documents` table to track uploaded files
- Row Level Security (RLS) policies for data protection

## Testing the Fix

After running the SQL script:

1. **Refresh the page**
2. **Try uploading a document**
3. **Check the browser console** for success messages
4. **Verify files appear in the Storage section** of your Supabase dashboard

## Troubleshooting

If uploads still fail:

1. **Check browser console** for error messages
2. **Verify bucket permissions** in Supabase dashboard
3. **Ensure user is authenticated**
4. **Check file size limits** (10MB for documents, 5MB for avatars)

## File Locations

- SQL Script: `create-buckets-direct.sql`
- Document Upload Component: `src/components/DocumentUpload.tsx`
- Test Script: `test-storage.js`

## Security Notes

- Each user can only access their own files
- Admin users have full access
- File paths use user ID for isolation
- RLS policies enforce data protection
