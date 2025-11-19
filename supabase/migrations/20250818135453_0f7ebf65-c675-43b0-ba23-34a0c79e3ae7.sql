-- Add admin access policy for clients table
CREATE POLICY "Admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (is_admin());

-- Add admin update policy for clients table  
CREATE POLICY "Admins can update all clients"
ON public.clients 
FOR UPDATE 
USING (is_admin());