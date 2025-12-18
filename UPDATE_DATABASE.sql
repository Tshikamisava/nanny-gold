-- Step 1: Check current state of bookings
SELECT 
  'Before Update' as stage,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN admin_revenue = 0 OR admin_revenue IS NULL THEN 1 END) as bookings_with_zero_admin_revenue,
  COUNT(CASE WHEN nanny_earnings < 0 THEN 1 END) as bookings_with_negative_earnings
FROM bookings
WHERE status NOT IN ('cancelled', 'rejected');

-- Step 2: Update ALL bookings to recalculate their financials
WITH updated_revenue AS (
  SELECT 
    b.id,
    rev.fixed_fee,
    rev.commission_percent,
    rev.commission_amount,
    rev.admin_total_revenue,
    rev.nanny_earnings
  FROM bookings b
  CROSS JOIN LATERAL (
    SELECT * FROM calculate_booking_revenue(
      b.id,
      b.total_monthly_cost,
      b.booking_type,
      b.base_rate,
      (SELECT home_size FROM clients WHERE id = b.client_id)
    )
  ) AS rev
  WHERE b.status NOT IN ('cancelled', 'rejected')
)
UPDATE bookings
SET
  placement_fee = updated_revenue.fixed_fee,
  commission_rate = updated_revenue.commission_percent,
  commission_amount = updated_revenue.commission_amount,
  admin_revenue = updated_revenue.admin_total_revenue,
  nanny_earnings = updated_revenue.nanny_earnings,
  updated_at = NOW()
FROM updated_revenue
WHERE bookings.id = updated_revenue.id;

-- Step 3: Verify the update worked
SELECT 
  'After Update' as stage,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN admin_revenue = 0 OR admin_revenue IS NULL THEN 1 END) as bookings_with_zero_admin_revenue,
  COUNT(CASE WHEN nanny_earnings < 0 THEN 1 END) as bookings_with_negative_earnings,
  MIN(admin_revenue) as min_admin_revenue,
  MAX(admin_revenue) as max_admin_revenue,
  AVG(admin_revenue) as avg_admin_revenue,
  MIN(nanny_earnings) as min_nanny_earnings,
  MAX(nanny_earnings) as max_nanny_earnings,
  AVG(nanny_earnings) as avg_nanny_earnings
FROM bookings
WHERE status NOT IN ('cancelled', 'rejected');

-- Step 4: Show sample bookings to verify calculations
SELECT 
  id,
  booking_type,
  base_rate,
  total_monthly_cost,
  placement_fee,
  commission_rate,
  commission_amount,
  admin_revenue,
  nanny_earnings,
  status
FROM bookings
WHERE status NOT IN ('cancelled', 'rejected')
ORDER BY created_at DESC
LIMIT 10;
