-- Add missing columns to referral_participants table
ALTER TABLE public.referral_participants 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS date_issued timestamp with time zone DEFAULT now();

-- Create reward_balances table for tracking client/nanny reward earnings
CREATE TABLE IF NOT EXISTS public.reward_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  total_earned numeric DEFAULT 0,
  total_redeemed numeric DEFAULT 0,
  available_balance numeric GENERATED ALWAYS AS (total_earned - total_redeemed) STORED,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on reward_balances
ALTER TABLE public.reward_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for reward_balances
CREATE POLICY "Users can view their own reward balance" 
ON public.reward_balances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reward balances" 
ON public.reward_balances 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "System can update reward balances" 
ON public.reward_balances 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can insert their reward balance" 
ON public.reward_balances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger to update reward balances when referral logs change
CREATE OR REPLACE FUNCTION update_reward_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the referrer's reward balance
  INSERT INTO public.reward_balances (user_id, total_earned, total_redeemed)
  SELECT 
    rp.user_id,
    COALESCE(SUM(rl.reward_amount), 0) as total_earned,
    0 as total_redeemed
  FROM public.referral_participants rp
  LEFT JOIN public.referral_logs rl ON rl.referrer_id = rp.id AND rl.status = 'Approved'
  WHERE rp.id = COALESCE(NEW.referrer_id, OLD.referrer_id)
  GROUP BY rp.user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_earned = EXCLUDED.total_earned,
    last_updated = now(),
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_reward_balance
AFTER INSERT OR UPDATE ON public.referral_logs
FOR EACH ROW EXECUTE FUNCTION update_reward_balance();

-- Create table for tracking reward redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  booking_id uuid,
  amount_redeemed numeric NOT NULL,
  redemption_type text NOT NULL DEFAULT 'booking_payment',
  created_at timestamp with time zone DEFAULT now(),
  notes text
);

-- Enable RLS on reward_redemptions
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Create policies for reward_redemptions
CREATE POLICY "Users can view their redemptions" 
ON public.reward_redemptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions" 
ON public.reward_redemptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all redemptions" 
ON public.reward_redemptions 
FOR ALL 
USING (is_admin());

-- Update reward balances when redemptions are made
CREATE OR REPLACE FUNCTION update_balance_on_redemption()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reward_balances 
  SET 
    total_redeemed = total_redeemed + NEW.amount_redeemed,
    last_updated = now(),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_balance_on_redemption
AFTER INSERT ON public.reward_redemptions
FOR EACH ROW EXECUTE FUNCTION update_balance_on_redemption();