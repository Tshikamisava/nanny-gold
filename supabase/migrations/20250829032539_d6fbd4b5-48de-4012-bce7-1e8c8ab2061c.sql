-- Fix security issues: Add SET search_path to security definer functions
CREATE OR REPLACE FUNCTION update_reward_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION update_balance_on_redemption()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.reward_balances 
  SET 
    total_redeemed = total_redeemed + NEW.amount_redeemed,
    last_updated = now(),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;