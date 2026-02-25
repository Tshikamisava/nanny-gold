/**
 * Helper functions for Gap Coverage pricing calculations
 */

export type GapCoverageType = 'normal' | 'busy_months' | 'promotional' | 'international' | 'sa_replacement' | 'sa_going_away';

/**
 * Check if current date falls within busy months (Dec/Jan or June/July)
 */
export const isBusyMonth = (date?: Date): boolean => {
  const checkDate = date || new Date();
  const month = checkDate.getMonth(); // 0-11 (Jan = 0, Dec = 11)
  
  // December (11) or January (0)
  if (month === 11 || month === 0) return true;
  
  // June (5) or July (6)
  if (month === 5 || month === 6) return true;
  
  return false;
};

/**
 * Check if any selected dates fall within busy months
 */
export const hasBusyMonthDates = (selectedDates: string[]): boolean => {
  return selectedDates.some(dateStr => {
    const date = new Date(dateStr);
    return isBusyMonth(date);
  });
};

/**
 * Determine client type based on profile data
 * This would need to be enhanced with actual client profile data
 */
export const determineClientType = (clientProfile?: {
  country?: string;
  phoneNumber?: string;
  isReplacementNanny?: boolean;
  isGoingAway?: boolean;
}): GapCoverageType => {
  // Check if international (based on country or phone number)
  if (clientProfile?.country && clientProfile.country !== 'ZA' && clientProfile.country !== 'South Africa') {
    return 'international';
  }
  
  // Check phone number country code (would need more sophisticated detection)
  if (clientProfile?.phoneNumber) {
    // Example: +1, +44, +27 (SA), etc.
    const phone = clientProfile.phoneNumber;
    if (phone.startsWith('+27') || phone.startsWith('27')) {
      // South African number
      if (clientProfile.isReplacementNanny) return 'sa_replacement';
      if (clientProfile.isGoingAway) return 'sa_going_away';
    } else {
      // International number
      return 'international';
    }
  }
  
  // Default to normal for South African clients
  return 'normal';
};

/**
 * Get placement fee based on days and pricing type
 */
export const getPlacementFee = (
  days: number,
  type: GapCoverageType,
  isPromotional: boolean = false
): number => {
  if (isPromotional) {
    // Promotional uses normal pricing
    type = 'normal';
  }
  
  // Determine tier based on days
  let tier: 'short' | 'medium' | 'extended';
  if (days <= 10) {
    tier = 'short';
  } else if (days <= 20) {
    tier = 'medium';
  } else {
    tier = 'extended';
  }
  
  switch (type) {
    case 'normal':
      return SERVICE_PRICING.short_term.gap_coverage.normal.placement_fee[tier];
    
    case 'busy_months':
      return SERVICE_PRICING.short_term.gap_coverage.busy_months.placement_fee[tier];
    
    case 'international':
      return SERVICE_PRICING.short_term.gap_coverage.international.placement_fee;
    
    case 'sa_replacement':
      return SERVICE_PRICING.short_term.gap_coverage.sa_replacement.placement_fee;
    
    case 'sa_going_away':
      return SERVICE_PRICING.short_term.gap_coverage.sa_going_away.placement_fee;
    
    default:
      return SERVICE_PRICING.short_term.gap_coverage.normal.placement_fee[tier];
  }
};

/**
 * Calculate service fee per day based on pricing type and days
 */
export const calculateServiceFeePerDay = (
  days: number,
  monthlyBase: number,
  addOnsTotal: number,
  type: GapCoverageType,
  isPromotional: boolean = false
): number => {
  if (isPromotional) {
    // Promotional uses normal pricing
    type = 'normal';
  }
  
  // For 10 days or less, use fixed daily rate
  if (days <= 10) {
    switch (type) {
      case 'normal':
        return SERVICE_PRICING.short_term.gap_coverage.normal.service_fee_per_day.short;
      
      case 'busy_months':
        return SERVICE_PRICING.short_term.gap_coverage.busy_months.service_fee_per_day.short;
      
      case 'international':
        return SERVICE_PRICING.short_term.gap_coverage.international.service_fee_per_day.short;
      
      case 'sa_replacement':
      case 'sa_going_away':
        return SERVICE_PRICING.short_term.gap_coverage.sa_replacement.service_fee_per_day.short;
      
      default:
        return SERVICE_PRICING.short_term.gap_coverage.normal.service_fee_per_day.short;
    }
  }
  
  // For 11-30 days: Pro-rata calculation
  // Formula: (Monthly base + Add-ons) / 31 = Service Fee Per day
  const totalMonthlyFee = monthlyBase + addOnsTotal;
  let serviceFeePerDay = totalMonthlyFee / 31;
  
  // Apply surcharge if applicable
  let surcharge = 0;
  switch (type) {
    case 'busy_months':
      surcharge = SERVICE_PRICING.short_term.gap_coverage.busy_months.surcharge_percentage;
      break;
    
    case 'international':
    case 'sa_replacement':
    case 'sa_going_away':
      surcharge = SERVICE_PRICING.short_term.gap_coverage.international.surcharge_percentage;
      break;
    
    default:
      surcharge = 0;
  }
  
  if (surcharge > 0) {
    serviceFeePerDay = serviceFeePerDay * (1 + surcharge);
  }
  
  return serviceFeePerDay;
};

import { SERVICE_PRICING } from '@/constants/servicePricing';
