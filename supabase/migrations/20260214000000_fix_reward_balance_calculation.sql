-- Fix: update_reward_balance should count both 'Approved' AND 'Paid' logs in total_earned.
-- Previously only 'Approved' was counted, so when generate_nanny_payment_advice marks logs
-- as 'Paid', the trigger would recalculate total_earned without those paid logs,
-- incorrectly reducing the referrer's available_balance.

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
  LEFT JOIN public.referral_logs rl ON rl.referrer_id = rp.id AND rl.status IN ('Approved', 'Paid')
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
