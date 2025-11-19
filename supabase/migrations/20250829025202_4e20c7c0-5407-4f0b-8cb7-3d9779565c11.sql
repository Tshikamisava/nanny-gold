-- Create referral_participants table
CREATE TABLE public.referral_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Client', 'Nanny')),
  referral_code TEXT NOT NULL UNIQUE,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_logs table with reward tracking
CREATE TABLE public.referral_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.referral_participants(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placement_fee DECIMAL(10,2),
  reward_percentage DECIMAL(5,2),
  reward_amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referral_participants
CREATE POLICY "Admins can manage all referral participants" 
ON public.referral_participants 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own referral participation" 
ON public.referral_participants 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for referral_logs
CREATE POLICY "Admins can manage all referral logs" 
ON public.referral_logs 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view referral logs they're involved in" 
ON public.referral_logs 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = referred_user_id OR 
  EXISTS (
    SELECT 1 FROM public.referral_participants rp 
    WHERE rp.id = referrer_id AND rp.user_id = auth.uid()
  )
);

-- Create function to auto-calculate reward amount
CREATE OR REPLACE FUNCTION public.calculate_referral_reward()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-calculating rewards
CREATE TRIGGER calculate_referral_reward_trigger
  BEFORE INSERT OR UPDATE ON public.referral_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_referral_reward();

-- Create function to update updated_at timestamp
CREATE TRIGGER update_referral_participants_updated_at
  BEFORE UPDATE ON public.referral_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_referral_participants_user_id ON public.referral_participants(user_id);
CREATE INDEX idx_referral_participants_referral_code ON public.referral_participants(referral_code);
CREATE INDEX idx_referral_logs_referrer_id ON public.referral_logs(referrer_id);
CREATE INDEX idx_referral_logs_referred_user_id ON public.referral_logs(referred_user_id);
CREATE INDEX idx_referral_logs_status ON public.referral_logs(status);