# How to Apply the RLS Policy Fix Migration

## Method 1: Using Supabase Dashboard (Easiest - Recommended)

1. **Go to your Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the Migration SQL**
   - Open the file: `supabase/migrations/20250101000000_fix_nanny_profile_rls.sql`
   - Copy ALL the contents
   - Paste it into the SQL Editor

4. **Run the Migration**
   - Click the "Run" button (or press Ctrl+Enter)
   - Wait for it to complete
   - You should see "Success. No rows returned"

5. **Verify it Worked**
   - Try editing your nanny profile
   - Navigate away and back
   - Data should now persist!

## Method 2: Using Supabase CLI (If you have it installed)

1. **Open Terminal/PowerShell**
   - Navigate to your project folder

2. **Link to your project** (if not already linked)
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Push the migration**
   ```bash
   supabase db push
   ```

## Method 3: Manual SQL Execution

If you prefer, you can run this SQL directly in your Supabase SQL Editor:

```sql
-- Fix RLS policy to allow nannies to view their own profile regardless of approval status
-- This fixes the issue where nannies with 'pending' status cannot load or view their own profile

-- Drop the restrictive policy if it exists (allows viewing only approved nannies)
DROP POLICY IF EXISTS "Authenticated users can view approved nannies" ON public.nannies;

-- Drop the overly permissive policy if it exists (allows viewing all nannies)
DROP POLICY IF EXISTS "Anyone can view nannies" ON public.nannies;

-- Create policy that allows nannies to view their OWN profile regardless of approval status
CREATE POLICY "Nannies can view their own profile" 
ON public.nannies FOR SELECT 
USING (auth.uid() = id);

-- Create policy that allows authenticated users to view APPROVED nannies (for browsing/searching)
CREATE POLICY "Authenticated users can view approved nannies" 
ON public.nannies FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND approval_status = 'approved'
  AND auth.uid() != id  -- Don't apply this policy to own profile (handled by policy above)
);
```

## After Applying

1. **Test the fix:**
   - Edit your nanny profile
   - Save changes
   - Navigate to a different page
   - Navigate back to profile
   - Your data should still be there!

2. **If it still doesn't work:**
   - Check the browser console for any errors
   - Make sure you're logged in as a nanny user
   - Verify the migration ran successfully (check Supabase dashboard)




