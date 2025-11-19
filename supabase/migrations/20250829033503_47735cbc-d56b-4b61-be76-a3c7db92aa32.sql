-- Add rewards integration fields to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS rewards_applied numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rewards_balance_before numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rewards_balance_after numeric DEFAULT 0;

-- Create payment_advices table for nanny payments
CREATE TABLE IF NOT EXISTS public.payment_advices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nanny_id uuid NOT NULL,
  booking_id uuid,
  base_amount numeric NOT NULL DEFAULT 0,
  referral_rewards_included numeric DEFAULT 0,
  referral_rewards_details jsonb DEFAULT '[]'::jsonb,
  deductions numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_period_start date NOT NULL,
  payment_period_end date NOT NULL,
  issue_date date DEFAULT CURRENT_DATE,
  payment_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  advice_number text NOT NULL,
  currency text DEFAULT 'ZAR',
  status text DEFAULT 'pending',
  notes text
);

-- Enable RLS on payment_advices
ALTER TABLE public.payment_advices ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_advices
CREATE POLICY "Admins can manage all payment advices" 
ON public.payment_advices 
FOR ALL 
USING (is_admin());

CREATE POLICY "Nannies can view their payment advices" 
ON public.payment_advices 
FOR SELECT 
USING (auth.uid() = nanny_id);

-- Create function to generate invoice with rewards integration
CREATE OR REPLACE FUNCTION generate_client_invoice(
  p_client_id uuid,
  p_booking_id uuid DEFAULT NULL,
  p_base_amount numeric,
  p_apply_rewards boolean DEFAULT false,
  p_description text DEFAULT 'Service charges'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id uuid;
  v_rewards_balance numeric := 0;
  v_rewards_applied numeric := 0;
  v_final_amount numeric;
  v_invoice_number text;
BEGIN
  -- Generate invoice number
  v_invoice_number := 'INV-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('invoice_sequence')::text, 4, '0');
  
  -- Get client's available rewards balance
  SELECT COALESCE(available_balance, 0) INTO v_rewards_balance
  FROM public.reward_balances 
  WHERE user_id = p_client_id;
  
  -- Calculate rewards to apply
  IF p_apply_rewards AND v_rewards_balance > 0 THEN
    v_rewards_applied := LEAST(v_rewards_balance, p_base_amount);
  END IF;
  
  -- Calculate final amount
  v_final_amount := p_base_amount - v_rewards_applied;
  
  -- Create invoice
  INSERT INTO public.invoices (
    client_id,
    booking_id,
    amount,
    rewards_applied,
    rewards_balance_before,
    rewards_balance_after,
    invoice_number,
    line_items,
    status
  ) VALUES (
    p_client_id,
    p_booking_id,
    v_final_amount,
    v_rewards_applied,
    v_rewards_balance,
    v_rewards_balance - v_rewards_applied,
    v_invoice_number,
    jsonb_build_array(
      jsonb_build_object('description', p_description, 'amount', p_base_amount),
      CASE WHEN v_rewards_applied > 0 THEN 
        jsonb_build_object('description', 'Referral Rewards Credit', 'amount', -v_rewards_applied)
      ELSE NULL END
    ) - NULL, -- Remove null elements
    'pending'
  ) RETURNING id INTO v_invoice_id;
  
  -- Update rewards balance if rewards were applied
  IF v_rewards_applied > 0 THEN
    INSERT INTO public.reward_redemptions (
      user_id,
      amount_redeemed,
      redemption_type,
      notes
    ) VALUES (
      p_client_id,
      v_rewards_applied,
      'invoice_payment',
      'Applied to invoice ' || v_invoice_number
    );
  END IF;
  
  RETURN v_invoice_id;
END;
$$;

-- Create function to generate nanny payment advice with rewards
CREATE OR REPLACE FUNCTION generate_nanny_payment_advice(
  p_nanny_id uuid,
  p_base_amount numeric,
  p_period_start date,
  p_period_end date,
  p_booking_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_advice_id uuid;
  v_referral_rewards numeric := 0;
  v_referral_details jsonb := '[]'::jsonb;
  v_total_amount numeric;
  v_advice_number text;
  v_referral_log RECORD;
BEGIN
  -- Generate advice number
  v_advice_number := 'PA-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('payment_advice_sequence')::text, 4, '0');
  
  -- Get approved but unpaid referral rewards
  FOR v_referral_log IN 
    SELECT rl.id, rl.reward_amount, p.first_name, p.last_name
    FROM public.referral_logs rl
    JOIN public.referral_participants rp ON rp.id = rl.referrer_id
    JOIN public.profiles p ON p.id = rl.referred_user_id
    WHERE rp.user_id = p_nanny_id 
      AND rl.status = 'Approved'
      AND rl.created_at BETWEEN p_period_start AND p_period_end
  LOOP
    v_referral_rewards := v_referral_rewards + v_referral_log.reward_amount;
    v_referral_details := v_referral_details || jsonb_build_object(
      'referral_log_id', v_referral_log.id,
      'referred_client', v_referral_log.first_name || ' ' || v_referral_log.last_name,
      'reward_amount', v_referral_log.reward_amount
    );
  END LOOP;
  
  -- Calculate total amount
  v_total_amount := p_base_amount + v_referral_rewards;
  
  -- Create payment advice
  INSERT INTO public.payment_advices (
    nanny_id,
    booking_id,
    base_amount,
    referral_rewards_included,
    referral_rewards_details,
    total_amount,
    payment_period_start,
    payment_period_end,
    advice_number
  ) VALUES (
    p_nanny_id,
    p_booking_id,
    p_base_amount,
    v_referral_rewards,
    v_referral_details,
    v_total_amount,
    p_period_start,
    p_period_end,
    v_advice_number
  ) RETURNING id INTO v_advice_id;
  
  -- Mark referral rewards as paid
  UPDATE public.referral_logs 
  SET status = 'Paid', updated_at = now()
  WHERE id IN (
    SELECT (reward_detail->>'referral_log_id')::uuid
    FROM jsonb_array_elements(v_referral_details) AS reward_detail
  );
  
  RETURN v_advice_id;
END;
$$;

-- Create sequences for invoice and payment advice numbering
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS payment_advice_sequence START 1;