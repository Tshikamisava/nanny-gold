-- Work with existing booking_financials table structure
-- First, let's recalculate the financial data for existing bookings using the corrected logic

-- Update existing booking financials records with corrected calculations
UPDATE public.booking_financials
SET 
  fixed_fee = CASE 
    WHEN b.booking_type = 'long_term' THEN
      CASE 
        WHEN b.home_size IN ('Grand Retreat', 'Epic Estates') THEN b.base_rate * 0.50
        ELSE 2500.00
      END
    ELSE 35.00 -- Short-term: R35 per day (simplified to 1 day for now)
  END,
  commission_percent = CASE 
    WHEN b.booking_type = 'long_term' THEN
      CASE 
        WHEN b.base_rate >= 10000 THEN 25
        WHEN b.base_rate <= 5000 THEN 10
        ELSE 15
      END
    ELSE 20 -- Short-term: flat 20%
  END,
  commission_amount = CASE 
    WHEN b.booking_type = 'long_term' THEN
      b.base_rate * (
        CASE 
          WHEN b.base_rate >= 10000 THEN 0.25
          WHEN b.base_rate <= 5000 THEN 0.10
          ELSE 0.15
        END
      )
    ELSE (COALESCE(b.total_monthly_cost, b.base_rate) - 35.00) * 0.20
  END,
  admin_total_revenue = CASE 
    WHEN b.booking_type = 'long_term' THEN
      (CASE 
        WHEN b.home_size IN ('Grand Retreat', 'Epic Estates') THEN b.base_rate * 0.50
        ELSE 2500.00
      END) + (b.base_rate * (
        CASE 
          WHEN b.base_rate >= 10000 THEN 0.25
          WHEN b.base_rate <= 5000 THEN 0.10
          ELSE 0.15
        END
      ))
    ELSE 35.00 + ((COALESCE(b.total_monthly_cost, b.base_rate) - 35.00) * 0.20)
  END,
  nanny_earnings = CASE 
    WHEN b.booking_type = 'long_term' THEN
      b.base_rate - (b.base_rate * (
        CASE 
          WHEN b.base_rate >= 10000 THEN 0.25
          WHEN b.base_rate <= 5000 THEN 0.10
          ELSE 0.15
        END
      ))
    ELSE COALESCE(b.total_monthly_cost, b.base_rate) - ((COALESCE(b.total_monthly_cost, b.base_rate) - 35.00) * 0.20)
  END,
  updated_at = now()
FROM public.bookings b
WHERE public.booking_financials.booking_id = b.id
  AND b.base_rate IS NOT NULL
  AND b.status IN ('confirmed', 'active', 'completed');