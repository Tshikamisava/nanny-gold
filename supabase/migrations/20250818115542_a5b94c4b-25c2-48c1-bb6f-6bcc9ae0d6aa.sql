-- Update temp_otp_codes table to support email OTPs
ALTER TABLE temp_otp_codes 
ADD COLUMN IF NOT EXISTS identifier TEXT,
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'signup';

-- Update existing columns if they exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_otp_codes' AND column_name = 'phone_number') THEN
        -- Rename phone_number to identifier if it exists
        ALTER TABLE temp_otp_codes RENAME COLUMN phone_number TO identifier_old;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_otp_codes' AND column_name = 'otp_code') THEN
        -- Rename otp_code to code if it exists
        ALTER TABLE temp_otp_codes RENAME COLUMN otp_code TO code_old;
    END IF;
END $$;

-- Make sure we have the right columns
ALTER TABLE temp_otp_codes 
ALTER COLUMN identifier SET NOT NULL,
ALTER COLUMN code SET NOT NULL;