-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.calculate_referral_reward()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Get the referrer's role to determine reward percentage
  SELECT CASE 
    WHEN rp.role = 'Nanny' THEN 10.0
    WHEN rp.role = 'Client' THEN 20.0
    ELSE 0.0
  END INTO NEW.reward_percentage
  FROM public.referral_participants rp
  WHERE rp.id = NEW.referrer_id;
  
  -- Calculate reward amount if placement fee is set
  IF NEW.placement_fee IS NOT NULL AND NEW.reward_percentage IS NOT NULL THEN
    NEW.reward_amount := NEW.placement_fee * NEW.reward_percentage / 100;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;