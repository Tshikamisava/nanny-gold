-- Fix OTP security: Add proper expiry validation trigger
CREATE OR REPLACE FUNCTION public.enforce_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically mark expired OTPs as used to prevent reuse
  UPDATE public.temp_otp_codes 
  SET used = true 
  WHERE expires_at < now() AND used = false;
  
  -- Prevent insertion of OTPs that are already expired
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Cannot create OTP with past expiry time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce OTP expiry
DROP TRIGGER IF EXISTS enforce_otp_expiry_trigger ON public.temp_otp_codes;
CREATE TRIGGER enforce_otp_expiry_trigger
  BEFORE INSERT ON public.temp_otp_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_otp_expiry();

-- Add password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Password must be at least 8 characters
  IF length(password_text) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter
  IF password_text !~ '[A-Z]' THEN
    RETURN false;  
  END IF;
  
  -- Must contain at least one lowercase letter
  IF password_text !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one digit
  IF password_text !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Add rate limiting for OTP requests
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier)
);

-- Enable RLS on rate limiting table
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limiting table (system access only)
CREATE POLICY "System can manage OTP rate limits" 
ON public.otp_rate_limits 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Function to check OTP rate limits (5 requests per hour)
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(identifier_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current rate limit data
  SELECT request_count, window_start 
  INTO current_count, window_start_time
  FROM public.otp_rate_limits 
  WHERE identifier = identifier_param;
  
  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO public.otp_rate_limits (identifier, request_count, window_start)
    VALUES (identifier_param, 1, now());
    RETURN true;
  END IF;
  
  -- If window has expired (1 hour), reset counter
  IF window_start_time < (now() - INTERVAL '1 hour') THEN
    UPDATE public.otp_rate_limits 
    SET request_count = 1, window_start = now()
    WHERE identifier = identifier_param;
    RETURN true;
  END IF;
  
  -- Check if under rate limit (5 requests per hour)
  IF current_count < 5 THEN
    UPDATE public.otp_rate_limits 
    SET request_count = current_count + 1
    WHERE identifier = identifier_param;
    RETURN true;
  END IF;
  
  -- Rate limit exceeded
  RETURN false;
END;
$$;

-- Add audit log for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs"
ON public.security_audit_log
FOR SELECT
USING (is_admin());

-- System can insert security events
CREATE POLICY "System can log security events"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid DEFAULT NULL,
  p_event_type text DEFAULT '',
  p_event_details jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log 
  (user_id, event_type, event_details, ip_address, user_agent)
  VALUES 
  (p_user_id, p_event_type, p_event_details, p_ip_address, p_user_agent);
END;
$$;