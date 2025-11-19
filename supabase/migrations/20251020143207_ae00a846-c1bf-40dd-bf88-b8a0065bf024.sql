-- Add RLS policy to allow nannies to view client profiles for their bookings
CREATE POLICY "Nannies can view client profiles for their bookings"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if the profile belongs to a client who has a booking with this nanny
  EXISTS (
    SELECT 1 
    FROM public.bookings b
    WHERE b.client_id = profiles.id 
      AND b.nanny_id = auth.uid()
  )
);