# Pricing Calculation Logic Explanation

## Overview
The pricing system has **three main calculation paths** depending on booking type:
1. **Short-term Hourly** (Emergency, Date Night, Date Day, School Holiday)
2. **Short-term Daily** (Gap Coverage/Temporary Support)
3. **Long-term Monthly** (Live-in/Live-out arrangements)

---

## 1. SHORT-TERM HOURLY PRICING

### Calculation Flow:
```
Base Hourly Rate → × Total Hours → + Service Add-ons → + Service Fee = Total
```

### Base Rates:
- **Emergency**: R80/hour (minimum 5 hours)
- **Date Night**: R120/hour (minimum 3 hours)
- **Date Day**: R40/hour standard, R55/hour weekend (Fri/Sat/Sun)
- **School Holiday**: Same as Date Day

### Weekend Detection:
- Checks if selected dates include Friday (5), Saturday (6), or Sunday (0)
- **Issue**: Timezone handling - currently converts to SAST (UTC+2) in edge function
- **Potential Error**: Date parsing might fail if dates are in wrong format

### Service Add-ons (Short-term):
- **Cooking**: R100/day (multiplied by number of days, NOT hours)
- **Light Housekeeping**: Daily rate based on home size:
  - Pocket Palace: R80/day
  - Family Hub: R100/day
  - Grand Estate: R120/day
  - Monumental Manor: R140/day
  - Epic Estates: R300/day
- **Diverse Ability Support**: R0 (free)
- **Pet Care**: R0 (free)

### Service Fee:
- **R35** for all short-term hourly bookings

### Where It's Calculated:
1. **Edge Function**: `supabase/functions/calculate-hourly-pricing/index.ts`
   - Used for real-time calculations in MatchResults
   - Handles weekend detection with timezone conversion
   
2. **Client-side**: `src/utils/pricingUtils.ts` → `calculateHourlyPricing()`
   - Fallback if edge function fails
   - Used in BookingContext

3. **BookingContext**: `src/contexts/BookingContext.tsx` → `calculateShortTermPricing()`
   - Client-side calculation for UI display
   - May have slight differences from edge function

### Potential Issues:
1. **Timezone Mismatch**: Edge function converts to SAST, client-side uses local time
2. **Cooking Calculation**: Should be per day, but might be calculated per hour in some places
3. **Light Housekeeping**: Needs `homeSize` and `selectedDates` - if missing, defaults to R100/day
4. **Total Hours Calculation**: Different methods in different places
5. **Weekend Detection**: Different logic in edge function vs client-side

---

## 2. SHORT-TERM DAILY PRICING (Gap Coverage)

### Calculation Flow:
```
(Weekday Rate × Weekdays) + (Weekend Rate × Weekend Days) + Service Add-ons = Total
```

### Base Rates:
- **Weekday** (Mon-Thu): R280/day
- **Weekend** (Fri-Sat-Sun): R350/day
- **Minimum**: 5 consecutive days required

### Service Add-ons:
- **Cooking**: R100/day
- **Light Housekeeping**: Same daily rates as hourly bookings
- **Service Fee**: R0 (waived for Gap Coverage)

### Where It's Calculated:
1. **Edge Function**: `calculate-hourly-pricing` (handles both hourly and daily)
2. **Client-side**: `calculateDailyPricing()` in `pricingUtils.ts`
3. **BookingContext**: `calculateShortTermPricing()` for `temporary_support`

### Potential Issues:
1. **Minimum Days Validation**: Must be 5 consecutive days - validation might fail
2. **Date Array Handling**: If `selectedDates` is empty or malformed, calculation fails
3. **Service Fee Confusion**: Gap Coverage has NO service fee, but code might add one

---

## 3. LONG-TERM MONTHLY PRICING

### Calculation Flow:
```
Base Monthly Rate (by home size + living arrangement) 
  + Child Surcharge (if > 3 children)
  + Adult Occupant Surcharge (if > 2 adults)
  + Service Add-ons (Cooking, Driving, Diverse Ability)
  = Monthly Total
  + Placement Fee (R2,500 or 50% for premium)
  = First Month Total
```

### Base Monthly Rates:
| Home Size | Live-in | Live-out |
|-----------|---------|----------|
| Pocket Palace | R4,500 | R4,800 |
| Family Hub | R6,000 | R6,800 |
| Grand Estate | R7,000 | R7,800 |
| Monumental Manor | R8,000 | R9,000 |
| Epic Estates | R10,000 | R11,000 |

### Service Add-ons (Long-term):
- **Cooking**: R1,500/month (FREE for Monumental Manor & Epic Estates)
- **Driving Support**: R1,500/month (FREE for Monumental Manor & Epic Estates)
- **Diverse Ability Support**: R1,500/month
- **Child Surcharge**: R500 per child over 3
- **Adult Occupant Surcharge**: R500 per adult over 2

### Placement Fee:
- **Standard** (Pocket Palace, Family Hub): R2,500
- **Premium** (Grand Estate, Monumental Manor, Epic Estates): 50% of monthly rate

### Where It's Calculated:
1. **Client-side**: `calculateLongTermPricing()` in `pricingUtils.ts`
2. **BookingContext**: `calculateLongTermPricing()` and `calculateNannySpecificPricing()`

### Potential Issues:
1. **Home Size Normalization**: Multiple ways to normalize (pocket_palace vs "Pocket Palace")
2. **Living Arrangement**: Handles both "live-in"/"live_in" and "live-out"/"live_out"
3. **Placement Fee Calculation**: Premium calculation happens AFTER add-ons, which might be wrong
4. **Missing Home Size**: Defaults to Family Hub if not provided

---

## COMMON ERROR SOURCES

### 1. **Missing Required Parameters**
- `totalHours` not calculated correctly for hourly bookings
- `selectedDates` empty or malformed
- `homeSize` not provided (defaults used, might be wrong)

### 2. **Calculation Method Mismatch**
- Edge function vs client-side calculations differ
- Weekend detection logic inconsistent
- Cooking calculated per hour instead of per day

### 3. **Service Fee Confusion**
- R35 for hourly bookings
- R0 for Gap Coverage
- Placement fee for long-term (different calculation)

### 4. **Timezone Issues**
- Edge function converts to SAST
- Client-side uses local time
- Weekend detection might be wrong

### 5. **Light Housekeeping Calculation**
- Needs both `homeSize` AND `selectedDates`
- If `selectedDates` missing, defaults to 1 day
- Daily rate multiplied by days, not hours

---

## RECOMMENDED FIXES

1. **Standardize Weekend Detection**: Use same logic everywhere
2. **Validate Inputs**: Check for required parameters before calculation
3. **Unify Calculation Methods**: Make edge function and client-side match exactly
4. **Fix Cooking Calculation**: Always per day, never per hour
5. **Add Error Handling**: Return clear error messages when calculation fails
6. **Log Calculations**: Add detailed logging to track where errors occur

---

## CALCULATION EXAMPLES

### Example 1: Emergency Booking (5 hours, with cooking, 1 day)
```
Base: R80/hr × 5hrs = R400
Cooking: R100/day × 1 day = R100
Service Fee: R35
Total: R535
```

### Example 2: Date Day Weekend (8 hours, Saturday, with cooking)
```
Base: R55/hr × 8hrs = R440
Cooking: R100/day × 1 day = R100
Service Fee: R35
Total: R575
```

### Example 3: Gap Coverage (5 days, 2 weekends, with cooking)
```
Weekdays: R280 × 3 = R840
Weekends: R350 × 2 = R700
Cooking: R100 × 5 = R500
Service Fee: R0
Total: R2,040
```

### Example 4: Long-term (Family Hub, Live-out, 4 children, cooking)
```
Base: R6,800
Child Surcharge: R500 (1 extra child)
Cooking: R1,500
Monthly Total: R8,800
Placement Fee: R2,500
First Month: R11,300
```
