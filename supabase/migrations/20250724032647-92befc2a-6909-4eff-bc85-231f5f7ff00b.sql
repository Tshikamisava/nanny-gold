-- Create payment authorizations table to track monthly payment flow
CREATE TABLE public.payment_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in kobo (Paystack uses kobo)
  currency TEXT DEFAULT 'NGN',
  authorization_code TEXT, -- Paystack authorization code
  authorization_date TIMESTAMPTZ, -- When payment was authorized (25th)
  capture_date TIMESTAMPTZ, -- When payment was captured (1st)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, authorized, captured, failed, cancelled
  paystack_reference TEXT UNIQUE,
  paystack_transaction_id TEXT,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_payment_authorizations_user_status ON public.payment_authorizations(user_id, status);
CREATE INDEX idx_payment_authorizations_dates ON public.payment_authorizations(authorization_date, capture_date);
CREATE INDEX idx_payment_authorizations_status ON public.payment_authorizations(status);

-- Enable RLS
ALTER TABLE public.payment_authorizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their payment authorizations" 
ON public.payment_authorizations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their payment authorizations" 
ON public.payment_authorizations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payment authorizations" 
ON public.payment_authorizations 
FOR UPDATE 
USING (true);

-- Create payment schedules table for tracking monthly cycles
CREATE TABLE public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  monthly_amount INTEGER NOT NULL, -- Amount in kobo
  currency TEXT DEFAULT 'NGN',
  authorization_day INTEGER DEFAULT 25, -- Day of month to authorize (25th)
  capture_day INTEGER DEFAULT 1, -- Day of month to capture (1st)
  is_active BOOLEAN DEFAULT true,
  last_authorization_date TIMESTAMPTZ,
  last_capture_date TIMESTAMPTZ,
  next_authorization_date TIMESTAMPTZ,
  next_capture_date TIMESTAMPTZ,
  customer_code TEXT, -- Paystack customer code for recurring charges
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_payment_schedules_user_active ON public.payment_schedules(user_id, is_active);
CREATE INDEX idx_payment_schedules_next_dates ON public.payment_schedules(next_authorization_date, next_capture_date);

-- Enable RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their payment schedules" 
ON public.payment_schedules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their payment schedules" 
ON public.payment_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payment schedules" 
ON public.payment_schedules 
FOR UPDATE 
USING (true);

-- Create function to calculate next payment dates
CREATE OR REPLACE FUNCTION calculate_next_payment_dates(
  input_date TIMESTAMPTZ DEFAULT now(),
  auth_day INTEGER DEFAULT 25,
  capture_day INTEGER DEFAULT 1
)
RETURNS TABLE(next_auth_date TIMESTAMPTZ, next_capture_date TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
  current_month_auth TIMESTAMPTZ;
  current_month_capture TIMESTAMPTZ;
  next_month_auth TIMESTAMPTZ;
  next_month_capture TIMESTAMPTZ;
BEGIN
  -- Calculate authorization date for current month (25th)
  current_month_auth := date_trunc('month', input_date) + INTERVAL '1 day' * (auth_day - 1);
  
  -- Calculate capture date for next month (1st)
  current_month_capture := date_trunc('month', input_date) + INTERVAL '1 month' + INTERVAL '1 day' * (capture_day - 1);
  
  -- If we've passed the current month's auth date, move to next month
  IF input_date > current_month_auth THEN
    next_auth_date := date_trunc('month', input_date) + INTERVAL '1 month' + INTERVAL '1 day' * (auth_day - 1);
    next_capture_date := date_trunc('month', input_date) + INTERVAL '2 months' + INTERVAL '1 day' * (capture_day - 1);
  ELSE
    next_auth_date := current_month_auth;
    next_capture_date := current_month_capture;
  END IF;
  
  RETURN QUERY SELECT next_auth_date, next_capture_date;
END;
$$;

-- Create trigger to update payment schedule dates
CREATE OR REPLACE FUNCTION update_payment_schedule_dates()
RETURNS TRIGGER AS $$
DECLARE
  dates RECORD;
BEGIN
  -- Calculate next payment dates
  SELECT * INTO dates FROM calculate_next_payment_dates(now(), NEW.authorization_day, NEW.capture_day);
  
  NEW.next_authorization_date := dates.next_auth_date;
  NEW.next_capture_date := dates.next_capture_date;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_schedule_dates_trigger
  BEFORE INSERT OR UPDATE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedule_dates();