-- Migration: Referral System
-- Description: Adds referral tracking and credit system for rewards.

-- 1. Add referral columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.clients(id);

-- 2. Create client_credits table
CREATE TABLE IF NOT EXISTS public.client_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    amount NUMERIC(10, 2) NOT NULL, -- Positive for earning, negative for spending
    source_booking_id UUID REFERENCES public.bookings(id),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for faster balance calculation
CREATE INDEX IF NOT EXISTS idx_client_credits_client ON public.client_credits(client_id);

-- 3. Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN := FALSE;
BEGIN
    -- If already set, do nothing
    IF NEW.referral_code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Generate a random 8-char alphanumeric code until unique
    WHILE NOT done LOOP
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)); -- Simple 6-char code
        
        -- Check uniqueness
        IF NOT EXISTS (SELECT 1 FROM public.clients WHERE referral_code = new_code) THEN
            done := TRUE;
        END IF;
    END LOOP;

    NEW.referral_code := new_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign referral code on insert
DROP TRIGGER IF EXISTS ensure_referral_code ON public.clients;
CREATE TRIGGER ensure_referral_code
    BEFORE INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION generate_unique_referral_code();

-- 4. Function to process referral reward (10% of Placement Fee)
CREATE OR REPLACE FUNCTION process_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_referrer_id UUID;
    v_placement_fee NUMERIC;
    v_reward_amount NUMERIC;
    v_existing_reward UUID;
BEGIN
    -- Get the booking's client
    SELECT client_id INTO v_client_id FROM public.bookings WHERE id = NEW.booking_id;
    
    -- Check if this client was referred
    SELECT referred_by INTO v_referrer_id FROM public.clients WHERE id = v_client_id;
    
    -- If no referrer, exit
    IF v_referrer_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if a reward was already given for this client (One-time reward per referred client)
    -- We assume the reward is for the "New Client", so typically given once on their first booking/placement.
    -- We'll check if any credit exists for this referrer stemming from this client (stored in metadata or source_booking linking handles specific booking).
    -- Requirement: "Clients get 10% of the Placement fee paid by a new client"
    -- If the client makes 2 bookings, do they get rewarded twice? "Paid by a new client" implies the relationship.
    -- Usually referral bonuses are one-off. I will assume one-off for the *First* placement.
    
    -- Check if we already rewarded this referrer for this client
    IF EXISTS (
        SELECT 1 FROM public.client_credits 
        WHERE client_id = v_referrer_id 
        AND (metadata->>'referred_client_id')::UUID = v_client_id
    ) THEN
        RETURN NEW;
    END IF;

    -- Get Placement Fee (Fixed Fee in financials)
    v_placement_fee := NEW.fixed_fee;
    
    -- If no placement fee, no reward (e.g. maybe pure hourly with strict no placement?)
    -- Note: Short term has small service fee, Long term has placement fee.
    -- Requirement: "10% of the Placement fee".
    IF v_placement_fee <= 0 THEN
        RETURN NEW;
    END IF;

    -- Calculate 10%
    v_reward_amount := ROUND(v_placement_fee * 0.10, 2);
    
    -- Insert Credit
    INSERT INTO public.client_credits (
        client_id,
        amount,
        source_booking_id,
        reason,
        metadata
    ) VALUES (
        v_referrer_id,
        v_reward_amount,
        NEW.booking_id,
        'Referral Reward for new client placement',
        jsonb_build_object('referred_client_id', v_client_id, 'placement_fee', v_placement_fee)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger logic: run when booking_financials is created (assuming that's when fee is finalized)
DROP TRIGGER IF EXISTS trigger_referral_reward ON public.booking_financials;
CREATE TRIGGER trigger_referral_reward
    AFTER INSERT ON public.booking_financials
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_reward();

-- 5. Helper function to get client balance
CREATE OR REPLACE FUNCTION get_client_credit_balance(p_client_id UUID)
RETURNS NUMERIC AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(amount) FROM public.client_credits WHERE client_id = p_client_id),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
