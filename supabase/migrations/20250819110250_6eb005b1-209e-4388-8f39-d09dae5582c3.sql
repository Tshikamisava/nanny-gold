-- Fix Auth OTP long expiry issue
-- Update temp_otp_codes table to use shorter expiry times (5 minutes instead of 10)
ALTER TABLE public.temp_otp_codes 
ALTER COLUMN expires_at SET DEFAULT (now() + '00:05:00'::interval);

-- Add a trigger to automatically cleanup expired OTPs more frequently
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up expired OTPs on each insert
  DELETE FROM public.temp_otp_codes 
  WHERE expires_at < now() OR used = true;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run cleanup on each OTP insertion
DROP TRIGGER IF EXISTS cleanup_otps_on_insert ON public.temp_otp_codes;
CREATE TRIGGER cleanup_otps_on_insert
  AFTER INSERT ON public.temp_otp_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_otps_trigger();