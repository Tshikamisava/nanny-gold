-- Update OTP expiry to be context-aware
-- SMS OTPs: 2 minutes (fast delivery)
-- Email OTPs: 10 minutes (account for email delays)

-- Update the default expiry to 10 minutes (for email OTPs)
ALTER TABLE public.temp_otp_codes 
ALTER COLUMN expires_at 
SET DEFAULT (now() + INTERVAL '10 minutes');

-- Add delivery method tracking
ALTER TABLE public.temp_otp_codes 
ADD COLUMN delivery_method text DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms'));

-- Create index for better performance on delivery method queries
CREATE INDEX IF NOT EXISTS idx_temp_otp_codes_delivery_method 
ON public.temp_otp_codes(delivery_method, expires_at) 
WHERE used = false;

-- Update OTP enforcement function to handle different expiry times
CREATE OR REPLACE FUNCTION public.enforce_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically mark expired OTPs as used to prevent reuse
  UPDATE public.temp_otp_codes 
  SET used = true 
  WHERE expires_at < now() AND used = false;
  
  -- Set appropriate expiry based on delivery method
  IF NEW.delivery_method = 'sms' THEN
    -- SMS: 2 minutes (fast delivery)
    NEW.expires_at := now() + INTERVAL '2 minutes';
  ELSE
    -- Email: 10 minutes (account for email delays)
    NEW.expires_at := now() + INTERVAL '10 minutes';
  END IF;
  
  -- Prevent insertion of OTPs that are already expired
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Cannot create OTP with past expiry time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update cleanup function to handle mixed expiry times
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
      'cleaned_at', now(),
      'cleaned_expired_otps', true
    )
  );
END;
$$;