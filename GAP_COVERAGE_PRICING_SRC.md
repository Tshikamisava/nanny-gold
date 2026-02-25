# Gap Coverage Pricing System - Technical Specification Document

## Overview

The Gap Coverage service provides temporary nanny support for periods ranging from 5 to 30 days. The pricing system has been redesigned to use a **tiered placement fee structure** and a **prorata monthly service fee calculation** based on home size (sleep-out arrangement).

## Service Structure

### Three Main Offer Types

1. **Promotional/Introductory Gap 2026** (Featured)
   - Uses normal pricing structure
   - Special payment terms:
     - Placement Fee: Payable over 2 months
     - Service Fee: 50% in monthly payments before booking starts
     - Balance: Paid on last day of booking

2. **Normal Days** (Standard Pricing)
   - Available year-round
   - Standard pricing tiers based on booking duration

3. **Busy Months** (December/January, June/July)
   - Only available during these specific months
   - Grayed out and disabled outside these periods
   - Higher pricing with 30% surcharge for 11-30 day bookings

## Pricing Structure

### A. Normal Days Pricing

#### Placement Fees (Payable First)
- **10 days**: R750
- **11-20 days**: R1,200
- **21-30 days**: R1,800

#### Service Fees Per Day
- **10 days**: Fixed rate of **R370/day**
- **11-30 days**: Pro-rata calculation
  - Formula: `(Monthly Base + Add-ons) ÷ 31 = Service Fee Per Day`
  - Monthly Base = Home size monthly rate (sleep-out arrangement)
  - Add-ons = Cooking, Light Housekeeping, Diverse Ability Support, Driving Support

### B. Busy Months Pricing (Dec/Jan, June/July)

#### Placement Fees (Payable First)
- **10 days**: R1,500
- **11-20 days**: R2,000
- **21-30 days**: R2,500

#### Service Fees Per Day
- **10 days**: Fixed rate of **R420/day**
- **11-30 days**: Pro-rata calculation + **30% surcharge**
  - Formula: `((Monthly Base + Add-ons) ÷ 31) × 1.30 = Service Fee Per Day`

### C. Promotional/Introductory Gap 2026

- Uses **Normal Days** pricing structure
- Special payment terms (see above)

### D. International Families

#### Placement Fee
- **Flat R5,000** regardless of booking duration

#### Service Fees Per Day
- **10 days**: Fixed rate of **R840/day**
- **11-30 days**: Pro-rata calculation + **10% surcharge**
  - Formula: `((Monthly Base + Add-ons) ÷ 31) × 1.10 = Service Fee Per Day`

### E. South African Families - Replacement Nanny

#### Placement Fee
- **Flat R2,500** regardless of booking duration

#### Service Fees Per Day
- **10 days**: Fixed rate of **R420/day**
- **11-30 days**: Pro-rata calculation + **10% surcharge**
  - Formula: `((Monthly Base + Add-ons) ÷ 31) × 1.10 = Service Fee Per Day`

### F. South African Families - Going Away Within SA

#### Placement Fee
- **Flat R3,500** regardless of booking duration

#### Service Fees Per Day
- **10 days**: Fixed rate of **R420/day**
- **11-30 days**: Pro-rata calculation + **10% surcharge**
  - Formula: `((Monthly Base + Add-ons) ÷ 31) × 1.10 = Service Fee Per Day`

## Monthly Base Rates (Sleep-Out Arrangement)

Based on home size, using **live_out** rates from long-term pricing:

| Home Size | Monthly Rate |
|-----------|--------------|
| Pocket Palace | R4,800 |
| Family Hub | R6,800 |
| Grand Estate | R7,800 |
| Monumental Manor | R9,000 |
| Epic Estates | R11,000 |

## Add-On Services (Monthly Rates)

- **Cooking**: R1,500/month
- **Light Housekeeping**: Based on home size
  - Pocket Palace: R80/day × 30 = R2,400/month
  - Family Hub: R100/day × 30 = R3,000/month
  - Grand Estate: R120/day × 30 = R3,600/month
  - Monumental Manor: R140/day × 30 = R4,200/month
  - Epic Estates: R300/day × 30 = R9,000/month
- **Diverse Ability Support**: R1,500/month
- **Driving Support**: R1,500/month

## Service Fee Calculation Examples

### Example 1: Normal Days - 15 Days, Family Hub, No Add-ons

1. **Monthly Base**: R6,800
2. **Add-ons Total**: R0
3. **Total Monthly Fee**: R6,800
4. **Service Fee Per Day**: R6,800 ÷ 31 = **R219.35/day**
5. **Total Service Fee**: R219.35 × 15 = **R3,290.25**
6. **Placement Fee**: R1,200 (11-20 days tier)

### Example 2: Normal Days - 8 Days, Family Hub, With Cooking

1. **Monthly Base**: R6,800
2. **Add-ons Total**: R1,500 (Cooking)
3. **Service Fee Per Day**: **R370/day** (Fixed rate for ≤10 days)
4. **Total Service Fee**: R370 × 8 = **R2,960**
5. **Placement Fee**: R750 (≤10 days tier)

### Example 3: Busy Months - 20 Days, Family Hub, With Cooking & Light Housekeeping

1. **Monthly Base**: R6,800
2. **Add-ons Total**: R1,500 (Cooking) + R3,000 (Light Housekeeping) = R4,500
3. **Total Monthly Fee**: R6,800 + R4,500 = R11,300
4. **Service Fee Per Day (Base)**: R11,300 ÷ 31 = R364.52/day
5. **Service Fee Per Day (With Surcharge)**: R364.52 × 1.30 = **R473.87/day**
6. **Total Service Fee**: R473.87 × 20 = **R9,477.40**
7. **Placement Fee**: R2,000 (11-20 days tier)

### Example 4: Promotional - 25 Days, Grand Estate, With All Services

1. **Uses Normal Days pricing** (promotional only affects payment terms)
2. **Monthly Base**: R7,800
3. **Add-ons Total**: R1,500 (Cooking) + R3,600 (Light Housekeeping) + R1,500 (Diverse Ability) + R1,500 (Driving) = R8,100
4. **Total Monthly Fee**: R7,800 + R8,100 = R15,900
5. **Service Fee Per Day**: R15,900 ÷ 31 = **R512.90/day**
6. **Total Service Fee**: R512.90 × 25 = **R12,822.50**
7. **Placement Fee**: R1,800 (21-30 days tier)
8. **Payment Terms**:
   - Placement Fee: R1,800 ÷ 2 = R900/month for 2 months
   - Service Fee Upfront: R12,822.50 × 0.50 = R6,411.25 (before booking)
   - Service Fee Balance: R6,411.25 (on last day)

## Technical Implementation

### Key Files Modified

1. **`src/constants/servicePricing.ts`**
   - Added tiered pricing structure for all Gap Coverage types
   - Normal, Busy Months, Promotional, International, SA Replacement, SA Going Away

2. **`src/utils/pricingUtils.ts`**
   - Updated `calculateGapCoveragePricing()` function
   - New service fee calculation: `(Monthly Base + Add-ons) ÷ 31`
   - Tiered placement fee calculation
   - Surcharge application for busy months and special client types

3. **`src/pages/ShortTermBooking.tsx`**
   - Added Gap Coverage type selection UI
   - Shows Promotional, Normal, and Busy Months options
   - Busy Months grayed out when not in those months
   - Validates Gap Coverage type selection before proceeding

4. **`src/pages/PaymentScreen.tsx`**
   - Updated to show new service fee calculation
   - Displays placement fee and service fee separately
   - Handles promotional payment terms
   - Shows payment schedule with installments for promotional bookings

5. **`src/contexts/BookingContext.tsx`**
   - Updated to pass gapCoverageType and isPromotional to pricing calculation

6. **`supabase/functions/calculate-hourly-pricing/index.ts`**
   - Updated edge function to use new tiered pricing structure
   - Implements service fee calculation formula

7. **`src/types/booking.ts`**
   - Added `gapCoverageType` and `isPromotional` to UserPreferences interface

### Data Flow

1. **User selects Gap Coverage** → Shows sub-options (Promotional, Normal, Busy Months)
2. **User selects Gap Coverage type** → Stores in preferences
3. **User selects dates** → Validates minimum 5 days
4. **Pricing calculation** → Uses tiered structure based on:
   - Gap Coverage type (normal/busy_months/promotional)
   - Number of days (determines placement fee tier)
   - Home size (determines monthly base rate)
   - Selected add-ons (cooking, light housekeeping, etc.)
5. **Payment screen** → Shows:
   - Placement fee (payable first)
   - Service fee breakdown (per day × days)
   - Payment schedule (different for promotional)

### Payment Flow

#### Standard (Normal/Busy Months)
1. **Placement Fee**: Payable immediately to secure booking
2. **Service Fee**: Payable at end of booking period

#### Promotional
1. **Placement Fee**: Payable over 2 months (installments)
2. **Service Fee (50%)**: Payable in monthly installments before booking starts
3. **Service Fee (Balance)**: Payable on last day of booking

## UI/UX Features

### Gap Coverage Selection Screen

- **Promotional Offer**: Featured prominently with purple gradient and "PROMOTIONAL" badge
- **Normal Days**: Standard card with pricing tiers displayed
- **Busy Months**: 
  - Active (orange) when in Dec/Jan or June/July
  - Grayed out and disabled outside these months
  - Shows current period if active

### Payment Screen

- Shows detailed service fee calculation breakdown
- Displays placement fee and service fee separately
- For promotional: Shows installment payment schedule
- Clear indication of what's due when

## Validation Rules

1. **Minimum Days**: 5 consecutive days (Sundays can be excluded)
2. **Maximum Days**: 30 days
3. **Gap Coverage Type**: Must be selected before proceeding
4. **Busy Months**: Only selectable during Dec/Jan or June/July
5. **Home Size**: Required for service fee calculation

## Future Enhancements

- Client type detection (International, SA Replacement, SA Going Away) based on profile data
- Automatic busy month detection and pricing application
- Payment installment tracking for promotional bookings
- Invoice generation for multi-payment bookings
