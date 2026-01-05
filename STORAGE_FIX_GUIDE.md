# 🔧 Storage Bucket Fix Guide

## 🚨 **Issue Identified**
The storage buckets were **not actually created** despite the SQL script running successfully. Our test shows:
```
✅ Available buckets: []
❌ Documents bucket not found
❌ Avatars bucket not found
```

## 📋 **Step-by-Step Solution**

### **Step 1: Run the Manual Bucket Creation Script**

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `create-buckets-manual.sql`
4. **Run each section separately** (don't run the entire file at once):

#### **Section 1: Create Documents Bucket**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
```
✅ **Click "Run"** - You should see "Success" message

#### **Section 2: Create Avatars Bucket**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif']);
```
✅ **Click "Run"** - You should see "Success" message

#### **Section 3: Grant Permissions**
```sql
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated, anon;
GRANT SELECT ON storage.objects TO authenticated, anon;
```
✅ **Click "Run"**

#### **Section 4: Documents Policies**
```sql
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```
✅ **Click "Run"**

#### **Section 5: Avatars Policies**
```sql
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;

CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
);

CREATE POLICY "Users can update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```
✅ **Click "Run"**

#### **Section 6: Verify Buckets**
```sql
SELECT id, name, public FROM storage.buckets WHERE id IN ('documents', 'avatars');
```
✅ **Click "Run"** - You should see both buckets listed

### **Step 2: Test the Fix**

1. Run our test script to verify:
```bash
cd "c:\Users\Mzwandie\Videos\nanny-gold"
node test-storage-buckets.cjs
```

You should see:
```
✅ Available buckets: [{id: 'documents', name: 'documents'}, {id: 'avatars', name: 'avatars'}]
✅ Documents bucket found: {id: 'documents', name: 'documents'}
✅ Avatars bucket found: {id: 'avatars', name: 'avatars'}
✅ Upload test successful: {...}
🧹 Test file cleaned up
```

### **Step 3: Test in Your App**

1. Go to your nanny profile page
2. Try uploading a document
3. The error should be gone!

## 🔍 **Troubleshooting**

### **If Step 1 Fails:**
- Make sure you're logged in as an admin in Supabase
- Try running each SQL statement individually
- Check for syntax errors in the SQL Editor

### **If Upload Still Fails:**
- Check the browser console for specific error messages
- Verify RLS policies are correctly set
- Make sure you're authenticated in your app

### **Common Issues:**

#### **"Permission denied" Error**
- Run the permissions section again (Section 3)
- Make sure you're using the service role key if needed

#### **"Bucket not found" Error**
- Run the verification query (Section 6) to confirm buckets exist
- If not found, recreate them using Sections 1-2

#### **"MIME type not supported" Error**
- This is expected with our test script - it's testing with text/plain
- Your app will use proper file types (PDF, images, etc.)

## 🎯 **Expected Result**

After completing these steps:
- ✅ Storage buckets will be created
- ✅ Document upload will work
- ✅ Profile picture upload will work
- ✅ No more storage error messages

## 📞 **If Still Having Issues**

1. Check the exact error message in your browser console
2. Run the test script and share the output
3. Verify each SQL step completed successfully
4. Make sure you're using the correct Supabase project

The key issue was that the original SQL script didn't actually create the buckets. This manual approach ensures each step is executed properly! 🚀
