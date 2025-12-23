# Revenue Split Transparency Documentation

## ✅ Status: FULLY IMPLEMENTED & TRANSPARENT

This document details the complete revenue split calculation system and transparency features implemented across the Nanny Gold platform.

---

## 📊 Revenue Split Model

### **Long-term Bookings**

#### Placement Fee Structure:
```
Standard Homes (Pocket Palace, Family Hub):
- Fixed R2,500 one-time placement fee

Premium Homes (Grand Estate, Monumental Manor):
- 50% of monthly rate as placement fee
- Minimum R2,500
```

#### Commission Tiers (Sliding Scale):
```
Budget Tier (≤R5,000):      10% commission
Standard Tier (R5,001-R9,999): 15% commission
Premium Tier (≥R10,000):    25% commission
```

#### Calculation Example (R8,000 monthly rate - Standard home):
```
Client Pays (Monthly):
- Base rate: R8,000
- Additional services: R500
- Total monthly: R8,500

First Month Total:
- Monthly cost: R8,500
- Placement fee (one-time): R2,500
- First month total: R11,000

Nanny Earnings (Monthly):
- Base rate: R8,000
- Commission (15%): -R1,200
- Base net: R6,800
- Additional services (100%): +R500
- Total monthly earnings: R7,300

Admin Revenue:
- Placement fee (one-time): R2,500
- Monthly commission (15%): R1,200
- First month total: R3,700
- Subsequent months: R1,200/month
```

---

### **Short-term Bookings**

#### Fee Structure:
```
Service Fee: R35 per day
Commission: Flat 20%
```

#### Calculation Example (3-day booking, R1,500 total):
```
Client Pays:
- Total booking cost: R1,500

Nanny Earnings:
- Booking total: R1,500
- Commission (20%): -R300
- Service fee: -R105 (R35 × 3 days)
- Net earnings: R1,095

Admin Revenue:
- Service fee: R105
- Commission: R300
- Total revenue: R405
```

---

## 🎯 Transparency Implementation

### 1. **BookingRevenueDisplay Component**
**Location**: `src/components/BookingRevenueDisplay.tsx`

#### Features:
✅ Role-specific views (Client, Nanny, Admin)
✅ Complete cost breakdown
✅ Commission tier explanations with tooltips
✅ Placement fee calculations shown
✅ Color-coded sections for easy reading
✅ Informational tooltips for complex terms
✅ Mobile-responsive design

#### Client View Shows:
- Monthly rate breakdown
- Additional services cost
- One-time placement fee (with explanation)
- First month total vs. monthly total
- Transparency note showing nanny's share

#### Nanny View Shows:
- Base rate
- Commission percentage and amount (with tier info tooltip)
- Additional services (100% to nanny highlighted)
- Total monthly earnings
- Earnings breakdown explanation
- Note that placement fee doesn't affect nanny earnings

#### Admin View Shows:
- Monthly rate and additional services
- Placement fee (one-time)
- Monthly commission
- Total admin revenue (first month)
- Monthly recurring revenue
- Nanny earnings
- Revenue split explanation

---

### 2. **Database Function**
**Location**: `supabase/migrations/20251020140632_e7cdd38e-0d5d-4676-b468-21bcf786715e.sql`

#### Function: `calculate_booking_revenue`
```sql
Parameters:
- p_booking_type: 'long_term' or 'short_term'
- p_home_size: Home category
- p_client_total: Total booking amount
- p_additional_services_cost: Extra services cost

Returns:
- fixed_fee: Placement/service fee
- commission_percent: Commission percentage applied
- commission_amount: Actual commission amount
- nanny_earnings: Total nanny earnings
- admin_total_revenue: Total admin revenue
```

#### Calculation Logic:
```sql
Long-term:
IF monthly_rate >= 10000 THEN commission = 25%
ELSIF monthly_rate >= 5001 THEN commission = 15%
ELSE commission = 10%

Placement fee:
IF home IN ('grand_estate', 'monumental_manor')
  THEN fee = 50% of monthly_rate
  ELSE fee = R2,500

Nanny earnings = monthly_rate - commission + additional_services
Admin revenue = placement_fee + commission

Short-term:
Service fee = R35 × number_of_days
Commission = 20% of total
Nanny earnings = total - commission
Admin revenue = service_fee + commission
```

---

### 3. **Dashboard Integration**

#### Client Dashboard (`src/pages/client/ClientDashboard.tsx`):
✅ Shows total monthly cost per booking
✅ Links to detailed breakdown
✅ Clear pricing display

#### Client Booking Details (`src/pages/client/ClientBookingDetails.tsx`):
✅ Full BookingRevenueDisplay component integrated
✅ Shows placement fee separately (if applicable)
✅ Due date for placement fee payment
✅ Payment button for unpaid placement fees
✅ Complete transparency on what client pays vs. what nanny earns

#### Nanny Dashboard (`src/pages/nanny/NannyDashboard.tsx`):
✅ Total earnings displayed prominently
✅ Calculated from `booking_financials.nanny_earnings`
✅ Per-booking earnings shown

#### Nanny Bookings (`src/pages/nanny/NannyBookings.tsx`):
```typescript
calculateNannyEarnings = (baseRate, additionalServices, commissionPercent) => {
  const commissionAmount = baseRate * commissionPercent / 100;
  return baseRate - commissionAmount + additionalServices;
}
```
✅ Shows individual booking earnings
✅ Color-coded display (green for earnings)
✅ Sliding scale commission explanation

#### Admin Booking Management (`src/pages/admin/AdminBookingManagement.tsx`):
✅ Shows placement fee
✅ Shows commission percentage and amount
✅ Shows total admin revenue
✅ Shows nanny earnings
✅ Complete financial breakdown per booking
✅ Revenue analytics accessible

---

## 📈 Calculation Accuracy

### **Data Flow:**
```
1. Booking Created
   ↓
2. calculate_booking_revenue() function called
   ↓
3. booking_financials table populated:
   - fixed_fee
   - commission_percent
   - commission_amount
   - nanny_earnings
   - admin_total_revenue
   ↓
4. Values displayed on:
   - Client dashboard & details
   - Nanny dashboard & bookings
   - Admin management & analytics
```

### **Validation Points:**
✅ Database function ensures consistent calculations
✅ Frontend components use database values (single source of truth)
✅ Fallback calculations match database logic exactly
✅ All monetary values rounded to 2 decimal places
✅ Commission tiers validated against business rules

---

## 💡 Transparency Features

### **For Clients:**
1. **Clear Pricing Structure**
   - See exact breakdown of costs
   - Understand placement fee rationale
   - Know how much nanny receives
   - View additional services pass-through (100% to nanny)

2. **Trust Building**
   - Transparency note explaining commission usage
   - Platform value proposition clear
   - No hidden fees

3. **Payment Clarity**
   - First month vs. monthly costs clearly separated
   - Placement fee due dates visible
   - Easy payment options

### **For Nannies:**
1. **Earnings Visibility**
   - Exact commission percentage shown
   - Commission tier explanation with tooltips
   - Additional services highlighted (100% to nanny)
   - Monthly earnings calculated transparently

2. **Commission Understanding**
   - Tooltip explains sliding scale tiers
   - Shows what commission supports (background checks, insurance, marketing)
   - Clarifies placement fee doesn't reduce nanny earnings

3. **Financial Planning**
   - Clear per-booking earnings
   - Total earnings tracking
   - Historical data available

### **For Admins:**
1. **Revenue Tracking**
   - Per-booking revenue breakdown
   - Placement fees vs. recurring commission separated
   - Monthly recurring revenue (MRR) calculated
   - Total platform revenue visible

2. **Financial Analytics**
   - Commission tier distribution
   - Average booking value
   - Nanny earnings vs. admin revenue ratio
   - Placement fee collection status

---

## 🛠️ Technical Implementation

### **Components Created:**
1. `BookingRevenueDisplay.tsx` - Main transparency component
2. `RevenueBreakdown.tsx` - Calculation visualization
3. Database function: `calculate_booking_revenue`
4. Integration in all booking-related pages

### **Key Features:**
- **Role-based rendering**: Different views for client/nanny/admin
- **Responsive design**: Mobile-friendly layouts
- **Tooltip system**: Contextual explanations
- **Color coding**: Visual distinction (client=blue, nanny=green, admin=purple)
- **Accessibility**: Clear labels, semantic HTML, ARIA attributes

### **Data Sources:**
```typescript
// Primary: Database booking_financials table
booking_financials {
  fixed_fee
  commission_percent
  commission_amount
  nanny_earnings
  admin_total_revenue
}

// Fallback: Frontend calculation matching DB logic
calculateRevenueSplit(bookingType, totalAmount, homeSize, baseRate)
```

---

## ✅ Compliance & Best Practices

### **Financial Transparency:**
✅ All fees disclosed upfront
✅ Commission structure clearly explained
✅ No hidden charges
✅ Itemized breakdown available

### **Fair Revenue Split:**
✅ Nannies retain 75-90% of base rate
✅ 100% of additional services go to nannies
✅ Placement fee paid by client, not deducted from nanny
✅ Sliding scale rewards higher-value bookings

### **User Trust:**
✅ Calculations explained in plain language
✅ Tooltips for complex terms
✅ Consistent display across all interfaces
✅ Real-time updates from database

---

## 📊 Examples by Scenario

### **Scenario 1: Budget Long-term (R4,500/month)**
```
Client Pays Monthly: R4,500
Placement Fee (once): R2,500

Nanny Earnings:
- R4,500 - 10% (R450) = R4,050/month

Admin Revenue:
- First month: R2,500 + R450 = R2,950
- Monthly: R450
```

### **Scenario 2: Premium Long-term (R15,000/month + R1,000 services)**
```
Client Pays Monthly: R16,000
Placement Fee (once): R7,500 (50% of R15,000)

Nanny Earnings:
- R15,000 - 25% (R3,750) + R1,000 = R12,250/month

Admin Revenue:
- First month: R7,500 + R3,750 = R11,250
- Monthly: R3,750
```

### **Scenario 3: Short-term (5 days, R2,000 total)**
```
Client Pays: R2,000

Nanny Earnings:
- R2,000 - 20% (R400) = R1,600

Admin Revenue:
- Service fee: R175 (R35 × 5)
- Commission: R400
- Total: R575
```

---

## 🎉 Benefits

### **For Platform:**
- Builds trust through transparency
- Reduces support queries about pricing
- Demonstrates fair business model
- Competitive advantage

### **For Users:**
- Clear understanding of costs and earnings
- No surprises in payments
- Easy financial planning
- Confidence in platform fairness

---

## 📍 Where to See Revenue Breakdown

1. **Client**: `/dashboard/bookings/[bookingId]` - Full breakdown with BookingRevenueDisplay
2. **Nanny**: `/nanny/bookings` - Earnings per booking shown
3. **Admin**: `/admin/bookings` - Complete financial overview with revenue splits

**Access Test**: 
- Login as any role
- View bookings
- See transparent revenue breakdown immediately

---

**Last Updated**: December 11, 2025
**Status**: ✅ Production Ready
**Maintainer**: Nanny Gold Development Team
