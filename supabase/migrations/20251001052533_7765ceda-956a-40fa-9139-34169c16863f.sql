-- Add RLS policy to allow authenticated users to view profiles of approved nannies
CREATE POLICY "Users can view profiles of approved nannies"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.nannies n
    WHERE n.id = profiles.id 
      AND n.approval_status = 'approved'
  )
);