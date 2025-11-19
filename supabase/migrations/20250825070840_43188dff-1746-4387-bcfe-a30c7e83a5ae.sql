-- Fix critical security vulnerabilities

-- 1. Remove public access to nannies table
DROP POLICY IF EXISTS "Clients can view approved nannies" ON public.nannies;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated clients can view approved nannies" 
ON public.nannies 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND status = 'approved'
);

-- 2. Remove public access to temp_otp_codes table
DROP POLICY IF EXISTS "Allow public read access to temp_otp_codes" ON public.temp_otp_codes;
DROP POLICY IF EXISTS "temp_otp_codes are publicly accessible" ON public.temp_otp_codes;

-- Create system-only access for OTP codes
CREATE POLICY "System can manage OTP codes" 
ON public.temp_otp_codes 
FOR ALL 
USING (auth.role() = 'service_role');