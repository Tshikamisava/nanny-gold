-- Add admin RLS policies for bookings table
CREATE POLICY "Admins can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all bookings" 
ON public.bookings 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (is_admin());