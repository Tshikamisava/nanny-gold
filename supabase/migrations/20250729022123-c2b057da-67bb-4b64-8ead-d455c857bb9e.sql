-- Fix the cleanup function to have proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.temp_otp_codes 
  WHERE expires_at < now() OR used = true;
END;
$$;