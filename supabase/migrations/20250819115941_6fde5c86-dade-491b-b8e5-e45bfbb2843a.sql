-- Fix critical security issue: Secure temp_otp_codes table
-- Enable RLS and create proper policies to prevent unauthorized access

-- Enable Row Level Security on temp_otp_codes table
ALTER TABLE public.temp_otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policy that completely blocks public access
-- Only system functions should access OTP codes, never users directly
CREATE POLICY "No direct access to OTP codes" 
ON public.temp_otp_codes 
FOR ALL 
USING (false);

-- Create policy for system access only (for edge functions)
CREATE POLICY "System can manage OTP codes" 
ON public.temp_otp_codes 
FOR ALL 
TO service_role
USING (true);