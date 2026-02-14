-- Fix RLS policy to allow nannies to view their own profile regardless of approval status
-- This fixes the issue where nannies with 'pending' status cannot load or view their own profile

-- Drop ALL existing SELECT policies on nannies table to start fresh
DROP POLICY IF EXISTS "Authenticated users can view approved nannies" ON public.nannies;
DROP POLICY IF EXISTS "Anyone can view nannies" ON public.nannies;
DROP POLICY IF EXISTS "Nannies can view their own profile" ON public.nannies;

-- Create policy that allows nannies to view their OWN profile regardless of approval status
CREATE POLICY "Nannies can view their own profile" 
ON public.nannies FOR SELECT 
USING (auth.uid() = id);

-- Create policy that allows authenticated users to view APPROVED nannies (for browsing/searching)
-- Note: This policy excludes own profile (auth.uid() != id) so it doesn't conflict with the policy above
CREATE POLICY "Authenticated users can view approved nannies" 
ON public.nannies FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND approval_status = 'approved'
  AND auth.uid() != id  -- Don't apply this policy to own profile (handled by policy above)
);

