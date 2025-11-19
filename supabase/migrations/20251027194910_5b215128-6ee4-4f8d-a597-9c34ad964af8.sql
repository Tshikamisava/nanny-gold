-- Phase A: Fix placement fees for grand_estate bookings and recalculate temporary support booking

-- Fix placement fees for grand_estate bookings (should be R2,500 flat, not percentage-based)
UPDATE booking_financials bf
SET 
  fixed_fee = 2500.00,
  admin_total_revenue = commission_amount + 2500.00,
  updated_at = now()
FROM bookings b
WHERE 
  bf.booking_id = b.id
  AND b.home_size = 'grand_estate'
  AND b.booking_type = 'long_term'
  AND bf.fixed_fee != 2500.00;

-- Recalculate temporary support booking with R0 nanny earnings (booking_id: bce28f4b-8344-49de-9aea-2e7d32f3b975)
-- This booking should have proper nanny earnings calculated
UPDATE booking_financials bf
SET 
  commission_amount = ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.20, 2),
  nanny_earnings = ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.80, 2),
  admin_total_revenue = ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.20, 2) + bf.fixed_fee,
  updated_at = now()
FROM bookings b
WHERE 
  bf.booking_id = b.id
  AND b.id = 'bce28f4b-8344-49de-9aea-2e7d32f3b975'
  AND b.booking_type IN ('date_day', 'temporary_support', 'emergency', 'date_night')
  AND bf.nanny_earnings = 0;

-- Ensure all short-term bookings have proper nanny earnings (commission-based split)
UPDATE booking_financials bf
SET 
  commission_amount = CASE 
    WHEN (b.total_monthly_cost - bf.fixed_fee) <= 5000 THEN ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.10, 2)
    WHEN (b.total_monthly_cost - bf.fixed_fee) <= 9999 THEN ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.15, 2)
    ELSE ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.25, 2)
  END,
  nanny_earnings = CASE 
    WHEN (b.total_monthly_cost - bf.fixed_fee) <= 5000 THEN ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.90, 2)
    WHEN (b.total_monthly_cost - bf.fixed_fee) <= 9999 THEN ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.85, 2)
    ELSE ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.75, 2)
  END,
  admin_total_revenue = CASE 
    WHEN (b.total_monthly_cost - bf.fixed_fee) <= 5000 THEN ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.10, 2) + bf.fixed_fee
    WHEN (b.total_monthly_cost - bf.fixed_fee) <= 9999 THEN ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.15, 2) + bf.fixed_fee
    ELSE ROUND((b.total_monthly_cost - bf.fixed_fee) * 0.25, 2) + bf.fixed_fee
  END,
  updated_at = now()
FROM bookings b
WHERE 
  bf.booking_id = b.id
  AND b.booking_type IN ('date_day', 'temporary_support', 'emergency', 'date_night')
  AND bf.nanny_earnings = 0;

-- Add documentation comment explaining placement fee structure
COMMENT ON COLUMN booking_financials.fixed_fee IS 
'Placement fee structure: R2,500 flat for pocket_palace, family_hub, grand_estate. 50% of base_rate for epic_estates, monumental_manor. For short-term: R35 service fee (waived for 5+ consecutive days on temporary_support).';