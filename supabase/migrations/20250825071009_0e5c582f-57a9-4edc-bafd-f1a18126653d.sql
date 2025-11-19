-- Fix critical security vulnerabilities by replacing problematic policies

-- 1. Fix nannies table public access
DROP POLICY IF EXISTS "Clients can view approved nannies" ON public.nannies;

-- Create new policy requiring authentication for nannies table
CREATE POLICY "Authenticated users can view approved nannies" 
ON public.nannies 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND approval_status = 'approved'
);

-- 2. Fix temp_otp_codes public access - drop all public access policies
DROP POLICY IF EXISTS "Anyone can insert OTP codes" ON public.temp_otp_codes;
DROP POLICY IF EXISTS "Anyone can select OTP codes for verification" ON public.temp_otp_codes;
DROP POLICY IF EXISTS "Anyone can update OTP used status" ON public.temp_otp_codes;

-- The "System can manage OTP codes" policy already exists, so OTP functions will still work
-- The "No direct access to OTP codes" policy should block unauthorized access