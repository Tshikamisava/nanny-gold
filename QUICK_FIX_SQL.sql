-- Quick Fix: Drop and recreate the policies
-- Copy and paste this into Supabase SQL Editor

-- Drop ALL existing SELECT policies on nannies table
DROP POLICY IF EXISTS "Authenticated users can view approved nannies" ON public.nannies;
DROP POLICY IF EXISTS "Anyone can view nannies" ON public.nannies;
DROP POLICY IF EXISTS "Nannies can view their own profile" ON public.nannies;

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




