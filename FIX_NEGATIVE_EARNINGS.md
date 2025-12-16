# Fix for Negative Nanny Earnings Error

## Problem
The `calculate_booking_revenue` function has a bug in the short-term booking calculation:

**Current (INCORRECT):**
```sql
v_nanny_earnings := p_total_amount - v_commission_amount;
```

This only subtracts the commission but forgets to subtract the fixed fee, causing nanny earnings to be calculated as if they receive the fixed fee, which they don't.

**Correct:**
```sql
v_nanny_earnings := p_total_amount - v_fixed_fee - v_commission_amount;
```

## Example
For a short-term booking with 5 days:
- Total amount: R2,000
- Fixed fee: R35 × 5 = R175
- Commission base: R2,000 - R175 = R1,825
- Commission (20%): R1,825 × 0.20 = R365
- **Admin revenue:** R175 + R365 = R540
- **Nanny earnings (CORRECT):** R2,000 - R175 - R365 = **R1,460**
- **Nanny earnings (BUG):** R2,000 - R365 = R1,635 ❌ (This gives nanny the fixed fee too!)

The bug becomes apparent when the fixed fee is large or when there's additional cost calculation involved.

## Solution

### Step 1: Apply the migration to Supabase

1. Open your Supabase dashboard at https://supabase.com/dashboard
2. Go to your project
3. Navigate to **SQL Editor** in the left sidebar
4. Copy and paste the contents of `supabase/migrations/20251211_fix_nanny_earnings_calculation.sql`
5. Click **Run**

This will:
- ✅ Fix the `calculate_booking_revenue` function
- ✅ Update all existing bookings with negative nanny_earnings
- ✅ Add documentation comment to the function

### Step 2: Recalculate affected bookings

After applying the migration, run this query in the SQL Editor to recalculate all financials:

```sql
-- Recalculate financials for all bookings
DO $$
DECLARE
  booking_record RECORD;
  calc_result RECORD;
BEGIN
  FOR booking_record IN 
    SELECT id, total_monthly_cost, booking_type, home_size 
    FROM bookings 
  LOOP
    -- Call the fixed function
    SELECT * INTO calc_result 
    FROM calculate_booking_revenue(
      booking_record.id,
      booking_record.total_monthly_cost,
      booking_record.booking_type,
      booking_record.total_monthly_cost,
      booking_record.home_size
    );
    
    -- Update booking_financials
    UPDATE booking_financials
    SET 
      fixed_fee = calc_result.fixed_fee,
      commission_percent = calc_result.commission_percent,
      commission_amount = calc_result.commission_amount,
      admin_total_revenue = calc_result.admin_total_revenue,
      nanny_earnings = calc_result.nanny_earnings,
      updated_at = NOW()
    WHERE booking_id = booking_record.id;
    
  END LOOP;
END $$;
```

### Step 3: Verify the fix

Run this query to check that all bookings now have positive nanny_earnings:

```sql
SELECT 
  b.id,
  b.booking_type,
  b.total_monthly_cost,
  bf.fixed_fee,
  bf.commission_amount,
  bf.nanny_earnings,
  bf.admin_total_revenue
FROM bookings b
LEFT JOIN booking_financials bf ON bf.booking_id = b.id
WHERE bf.nanny_earnings < 0
ORDER BY b.created_at DESC;
```

This should return 0 rows if everything is fixed.

## Prevention

The migration also adds a trigger validation that prevents future bookings from having negative nanny_earnings, so this error won't occur again.
