-- Fix existing data before adding constraints

-- First, update existing invalid purpose values
UPDATE public.temp_otp_codes 
SET purpose = 'signup' 
WHERE purpose NOT IN ('signup', 'login', 'password_reset', 'email_verification');

-- Clean up invalid OTP codes (if any)
DELETE FROM public.temp_otp_codes 
WHERE code IS NULL OR code !~ '^[0-9]{6}$';

-- Now safely add the constraints
-- Ensure OTP codes are exactly 6 digits
ALTER TABLE public.temp_otp_codes 
ADD CONSTRAINT valid_otp_format 
CHECK (code ~ '^[0-9]{6}$');

-- Ensure purpose is valid
ALTER TABLE public.temp_otp_codes 
ADD CONSTRAINT valid_purpose 
CHECK (purpose IN ('signup', 'login', 'password_reset', 'email_verification'));

-- Fix function search paths (set to public schema)
ALTER FUNCTION public.enforce_otp_expiry() SET search_path = public;
ALTER FUNCTION public.validate_password_strength(text) SET search_path = public;
ALTER FUNCTION public.check_otp_rate_limit(text) SET search_path = public;
ALTER FUNCTION public.log_security_event(uuid, text, jsonb, text, text) SET search_path = public;

-- Reduce OTP expiry time from 5 minutes to 2 minutes for better security
ALTER TABLE public.temp_otp_codes 
ALTER COLUMN expires_at 
SET DEFAULT (now() + INTERVAL '2 minutes');

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_identifier 
ON public.otp_rate_limits(identifier);

CREATE INDEX IF NOT EXISTS idx_temp_otp_codes_identifier_expires 
ON public.temp_otp_codes(identifier, expires_at) 
WHERE used = false;

-- Enhanced cleanup function for expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired OTPs as used
  UPDATE public.temp_otp_codes 
  SET used = true 
  WHERE expires_at < now() AND used = false;
  
  -- Delete old OTPs (older than 24 hours)
  DELETE FROM public.temp_otp_codes 
  WHERE created_at < (now() - INTERVAL '24 hours');
  
  -- Reset old rate limit windows (older than 2 hours)
  DELETE FROM public.otp_rate_limits 
  WHERE window_start < (now() - INTERVAL '2 hours');
  
  -- Log cleanup event
  PERFORM public.log_security_event(
    NULL,
    'security_cleanup',
    jsonb_build_object(
      'cleaned_at', now()
    )
  );
END;
$$;