-- Extend referral_participants table for influencer codes
ALTER TABLE referral_participants 
ADD COLUMN IF NOT EXISTS is_influencer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS influencer_name TEXT,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC DEFAULT 20;

-- Extend clients table to track referral usage
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS referral_code_used TEXT,
ADD COLUMN IF NOT EXISTS placement_fee_original NUMERIC,
ADD COLUMN IF NOT EXISTS placement_fee_discounted NUMERIC,
ADD COLUMN IF NOT EXISTS discount_applied NUMERIC DEFAULT 0;

-- Extend referral_logs table for better tracking
ALTER TABLE referral_logs 
ADD COLUMN IF NOT EXISTS referrer_type TEXT CHECK (referrer_type IN ('nanny', 'client', 'influencer')),
ADD COLUMN IF NOT EXISTS discount_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- Create index for fast referral code lookups
CREATE INDEX IF NOT EXISTS idx_referral_code_active 
ON referral_participants(referral_code) 
WHERE active = true;

-- Comment on columns for documentation
COMMENT ON COLUMN referral_participants.is_influencer IS 'True if this code belongs to an external influencer rather than a platform user';
COMMENT ON COLUMN referral_participants.influencer_name IS 'Name of external influencer (for non-user influencers)';
COMMENT ON COLUMN referral_participants.discount_percentage IS 'Percentage discount given to referred client (default 20%)';
COMMENT ON COLUMN referral_participants.commission_percentage IS 'Percentage commission paid to referrer (default 20%)';
COMMENT ON COLUMN clients.referral_code_used IS 'Referral code used during signup';
COMMENT ON COLUMN clients.placement_fee_original IS 'Original placement fee before discount';
COMMENT ON COLUMN clients.placement_fee_discounted IS 'Final placement fee after referral discount';
COMMENT ON COLUMN clients.discount_applied IS 'Amount of discount from referral code';
COMMENT ON COLUMN referral_logs.referrer_type IS 'Type of referrer: nanny, client, or influencer';
COMMENT ON COLUMN referral_logs.discount_applied IS 'Discount amount given to referred client';
COMMENT ON COLUMN referral_logs.booking_id IS 'Associated booking ID for this referral';