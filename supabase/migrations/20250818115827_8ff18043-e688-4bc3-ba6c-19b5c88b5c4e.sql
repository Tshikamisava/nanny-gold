-- First clear any existing data that might have null values
DELETE FROM temp_otp_codes WHERE phone_number IS NULL OR otp_code IS NULL;

-- Drop and recreate the table with proper structure for email OTPs
DROP TABLE IF EXISTS temp_otp_codes;

CREATE TABLE temp_otp_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier text NOT NULL, -- email or phone number
    code text NOT NULL, -- the OTP code
    purpose text NOT NULL DEFAULT 'signup', -- 'signup' or 'password_reset'
    used boolean DEFAULT false,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE temp_otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert OTP codes" ON temp_otp_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select OTP codes for verification" ON temp_otp_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can update OTP used status" ON temp_otp_codes FOR UPDATE USING (true);