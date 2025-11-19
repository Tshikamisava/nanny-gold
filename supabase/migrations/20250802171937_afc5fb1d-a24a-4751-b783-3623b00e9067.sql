-- Fix currency default for South African operations
ALTER TABLE public.payment_schedules 
ALTER COLUMN currency SET DEFAULT 'ZAR';

-- Update existing records to use ZAR instead of NGN
UPDATE public.payment_schedules 
SET currency = 'ZAR' 
WHERE currency = 'NGN';