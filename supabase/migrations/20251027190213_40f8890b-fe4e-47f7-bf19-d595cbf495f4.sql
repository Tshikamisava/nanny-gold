-- Retrospective fix for all booking financials
-- This recalculates commission, nanny earnings, and admin revenue correctly

-- Step 1: Update long-term bookings with corrected financials
UPDATE booking_financials bf
SET 
  -- Calculate correct placement fee based on home size
  fixed_fee = CASE
    WHEN LOWER(b.home_size) IN ('pocket_palace', 'family_hub', 'grand_estate') THEN 2500.00
    WHEN LOWER(b.home_size) IN ('monumental_manor', 'epic_estates') THEN ROUND(b.base_rate * 0.50, 2)
    ELSE 2500.00
  END,
  
  -- Calculate correct commission based on sliding scale
  commission_percent = CASE
    WHEN b.total_monthly_cost >= 10000 THEN 25.0
    WHEN b.total_monthly_cost >= 5001 THEN 15.0
    ELSE 10.0
  END,
  
  -- Calculate commission amount
  commission_amount = CASE
    WHEN b.total_monthly_cost >= 10000 THEN ROUND(b.total_monthly_cost * 0.25, 2)
    WHEN b.total_monthly_cost >= 5001 THEN ROUND(b.total_monthly_cost * 0.15, 2)
    ELSE ROUND(b.total_monthly_cost * 0.10, 2)
  END,
  
  -- Calculate nanny earnings (total - commission)
  nanny_earnings = b.total_monthly_cost - CASE
    WHEN b.total_monthly_cost >= 10000 THEN ROUND(b.total_monthly_cost * 0.25, 2)
    WHEN b.total_monthly_cost >= 5001 THEN ROUND(b.total_monthly_cost * 0.15, 2)
    ELSE ROUND(b.total_monthly_cost * 0.10, 2)
  END,
  
  -- Calculate admin total revenue (placement fee + commission)
  admin_total_revenue = 
    CASE
      WHEN LOWER(b.home_size) IN ('pocket_palace', 'family_hub', 'grand_estate') THEN 2500.00
      WHEN LOWER(b.home_size) IN ('monumental_manor', 'epic_estates') THEN ROUND(b.base_rate * 0.50, 2)
      ELSE 2500.00
    END
    +
    CASE
      WHEN b.total_monthly_cost >= 10000 THEN ROUND(b.total_monthly_cost * 0.25, 2)
      WHEN b.total_monthly_cost >= 5001 THEN ROUND(b.total_monthly_cost * 0.15, 2)
      ELSE ROUND(b.total_monthly_cost * 0.10, 2)
    END,
  
  updated_at = now()
FROM bookings b
WHERE bf.booking_id = b.id
  AND b.booking_type = 'long_term';

-- Step 2: Update short-term bookings with corrected financials
UPDATE booking_financials bf
SET 
  fixed_fee = 35.00,
  commission_percent = 20.0,
  commission_amount = ROUND((b.total_monthly_cost - 35.00) * 0.20, 2),
  nanny_earnings = b.total_monthly_cost - ROUND((b.total_monthly_cost - 35.00) * 0.20, 2) - 35.00,
  admin_total_revenue = 35.00 + ROUND((b.total_monthly_cost - 35.00) * 0.20, 2),
  updated_at = now()
FROM bookings b
WHERE bf.booking_id = b.id
  AND b.booking_type IN ('emergency', 'date_night', 'date_day', 'temporary_support');

-- Step 3: Add validation trigger to ensure financials are always correct
CREATE OR REPLACE FUNCTION validate_booking_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate nanny earnings are never negative
  IF NEW.nanny_earnings < 0 THEN
    RAISE EXCEPTION 'Nanny earnings cannot be negative: %', NEW.nanny_earnings;
  END IF;
  
  -- Validate admin revenue is reasonable
  IF NEW.admin_total_revenue < 0 THEN
    RAISE EXCEPTION 'Admin revenue cannot be negative: %', NEW.admin_total_revenue;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_financials_trigger ON booking_financials;
CREATE TRIGGER validate_financials_trigger
  BEFORE INSERT OR UPDATE ON booking_financials
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_financials();