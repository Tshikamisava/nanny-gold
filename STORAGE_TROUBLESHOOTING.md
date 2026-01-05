# Storage Script Troubleshooting

## Common Errors and Fixes

### Error: "new row violates row-level security policy"
**Cause**: You're trying to create buckets with a user account instead of admin
**Fix**: 
1. Make sure you're logged in as the project owner/admin
2. Use the service role key if available
3. Run the simple script step by step

### Error: "function storage.foldername() does not exist"
**Cause**: Storage extension not enabled
**Fix**: 
1. Go to Supabase Dashboard → Database → Extensions
2. Enable the "storage" extension
3. Run the script again

### Error: "relation storage.buckets does not exist"
**Cause**: Storage not enabled in your project
**Fix**: 
1. Go to Supabase Dashboard → Storage
2. Enable storage if it's disabled
3. Try the script again

### Error: "permission denied for relation storage.buckets"
**Cause**: Insufficient permissions
**Fix**: 
1. Use the project owner account
2. Check if you have admin rights
3. Contact Supabase support if needed

## Step-by-Step Fix Process

### 1. Use the Simple Script
Instead of the complex script, use `create-storage-simple.sql`

### 2. Run in Sections
Run each section separately:
- Section 1: Create buckets
- Section 2: Grant permissions  
- Section 3: Documents policies
- Section 4: Avatars policies
- Section 5: Database table

### 3. Check Each Step
After each section, verify it worked:
```sql
-- Check buckets
SELECT * FROM storage.buckets;

-- Check policies  
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### 4. Manual Setup (if scripts fail)

#### Create Buckets Manually:
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Create `documents` bucket (public: false)
4. Create `avatars` bucket (public: true)

#### Create Policies Manually:
1. Click on each bucket
2. Go to "Policies" tab
3. Create policies using the SQL from the script

### 5. Test the Fix
After setup, test with:
```javascript
// Test in browser console
const { data } = await supabase.storage.listBuckets();
console.log(data);
```

## Alternative Solutions

### Option 1: Use Supabase Dashboard UI
1. Storage → New bucket → `documents`
2. Storage → New bucket → `avatars`  
3. For each bucket: Policies → Create policy
4. Use the policy SQL from the script

### Option 2: Contact Support
If nothing works:
1. Check your project permissions
2. Verify your account role
3. Contact Supabase support

## Quick Test Commands

```sql
-- Test if storage extension exists
SELECT * FROM pg_extension WHERE extname = 'supabase_storage';

-- Test if buckets exist
SELECT * FROM storage.buckets;

-- Test if policies exist
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

## What Should Work After Fix

- ✅ Buckets appear in Storage section
- ✅ Users can upload files to their own folders
- ✅ Files are organized as {user_id}/{filename}
- ✅ Document upload works in the app
- ✅ Profile picture upload works
