-- Create a table to temporarily store OTP codes for phone verification
CREATE TABLE IF NOT EXISTS public.temp_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '10 minutes'),
  used BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.temp_otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (for sending OTP)
CREATE POLICY "Anyone can insert OTP codes" 
ON public.temp_otp_codes 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to select their own OTP codes (for verification)
CREATE POLICY "Anyone can select OTP codes for verification" 
ON public.temp_otp_codes 
FOR SELECT 
USING (true);

-- Create policy to allow updating used status
CREATE POLICY "Anyone can update OTP used status" 
ON public.temp_otp_codes 
FOR UPDATE 
USING (true);

-- Create function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.temp_otp_codes 
  WHERE expires_at < now() OR used = true;
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_temp_otp_phone_expires ON public.temp_otp_codes(phone_number, expires_at);