import { SERVICE_PRICING } from '@/constants/servicePricing';

export interface HourlyPricingResult {
  baseRate: number;
  baseHourlyRate: number; // Alias for baseRate per hour specifically
  addOns: Array<{ name: string; price: number }>;
  services: Array<{ name: string; price: number; hourlyRate?: number; totalCost?: number }>; // Alias/Extension for UI
  subtotal: number;
  serviceFee: number;
  total: number;
  totalHours?: number;
  totalDays?: number;
  hourlyRate?: number; // Effective hourly rate including add-ons
  breakdown?: string;
}

export interface DailyPricingResult {
  baseRate: number; // Daily rate (for non-Gap Coverage) or monthly rate (for Gap Coverage)
  addOns: Array<{ name: string; price: number }>;
  services: Array<{ name: string; price: number }>;
  subtotal: number;
  serviceFee: number;
  total: number;
  totalDays: number;
  breakdown: Array<{ date: string; isWeekend: boolean; rate: number }>;
  // Gap Coverage specific fields
  placementFee?: number; // R2,500 placement fee (payable first)
  prorataMonthlyRate?: number; // Monthly rate based on home size (sleep-out)
  prorataAmount?: number; // Prorata amount for the booking period (payable at end)
  prorataDays?: number; // Number of days in booking period
  prorataMultiplier?: number; // Days / 30 for prorata calculation
}

export interface LongTermPricingResult {
  baseRate: number;
  addOns: Array<{ name: string; price: number }>;
  total: number;
  placementFee: number;
  bonusContribution: number;
  monthlyBreakdown: {
    baseService: number;
    addOnServices: number;
    totalMonthly: number;
  };
}

// Helper to normalize home size to dictionary keys
const normalizeHomeSize = (size?: string): "pocket_palace" | "family_hub" | "grand_estate" | "monumental_manor" | "epic_estates" => {
  if (!size) return 'family_hub';
  const lower = size.toLowerCase();

  if (['pocket_palace', 'family_hub', 'grand_estate', 'monumental_manor', 'epic_estates'].includes(lower)) {
    return lower as any;
  }

  if (lower.includes('pocket') || lower === 'small') return 'pocket_palace';
  if (lower.includes('family') || lower === 'medium') return 'family_hub';
  if (lower.includes('grand') && !lower.includes('epic')) return 'grand_estate';
  if (lower.includes('monumental') || lower === 'extra_large') return 'monumental_manor';
  if (lower.includes('epic')) return 'epic_estates';
  return 'family_hub';
};

// Helper functions for Gap Coverage pricing
const calculatePlacementFeeForGapCoverage = (
  days: number,
  type: 'normal' | 'busy_months' | 'promotional' | 'international' | 'sa_replacement' | 'sa_going_away',
  isPromotional: boolean = false
): number => {
  if (isPromotional) {
    type = 'normal';
  }
  
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

const calculateServiceFeePerDayForGapCoverage = (
  days: number,
  monthlyBase: number,
  addOnsTotal: number,
  type: 'normal' | 'busy_months' | 'promotional' | 'international' | 'sa_replacement' | 'sa_going_away',
  isPromotional: boolean = false
): number => {
  if (isPromotional) {
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
  
  // For 11-30 days: (Monthly base + Add-ons) / 31
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

export const calculateHourlyPricing = async (
  bookingType: 'emergency' | 'date_night' | 'date_day' | 'school_holiday' | 'temporary_support',
  totalHours: number,
  services: {
    cooking?: boolean;
    specialNeeds?: boolean; // Diverse Ability Support
    drivingSupport?: boolean;
    lightHousekeeping?: boolean;
    petCare?: boolean;
  },
  selectedDates: string[] = [],
  homeSize?: string
): Promise<HourlyPricingResult> => {
  // normalizedBookingType removed as unused

  // Initialize result
  let baseRate: number = 0;
  let hourlyRateOnly: number = 0;
  let serviceFee: number = SERVICE_PRICING.short_term.emergency.service_fee; // Default 35
  const addOns: Array<{ name: string; price: number; hourlyRate?: number; totalCost?: number }> = [];

  // 1. Calculate Base Rate & Service Fee
  if (bookingType === 'temporary_support') {
    // Should use calculateDailyPricing for this, but keeping fail-safe here just in case
    // This path might be deprecated if we strictly separate them
    const daily = calculateDailyPricing(selectedDates, bookingType, homeSize, services);
    return {
      baseRate: daily.baseRate,
      baseHourlyRate: 0,
      addOns: daily.addOns,
      services: daily.services,
      subtotal: daily.subtotal,
      serviceFee: daily.serviceFee,
      total: daily.total,
      totalDays: daily.totalDays
    };

  } else if (bookingType === 'emergency') {
    hourlyRateOnly = SERVICE_PRICING.short_term.emergency.hourly_rate;
    baseRate = hourlyRateOnly * Math.max(totalHours, SERVICE_PRICING.short_term.emergency.min_hours);
    serviceFee = SERVICE_PRICING.short_term.emergency.service_fee;

  } else if (bookingType === 'date_night') {
    hourlyRateOnly = SERVICE_PRICING.short_term.date_night.hourly_rate;
    baseRate = hourlyRateOnly * Math.max(totalHours, SERVICE_PRICING.short_term.date_night.min_hours);
    serviceFee = SERVICE_PRICING.short_term.date_night.service_fee;

  } else {
    // day_care, date_day, school_holiday
    let hourlyWithWeekend: number = SERVICE_PRICING.short_term.day_care.standard_hourly;

    if (selectedDates.length > 0) {
      const hasWeekend = selectedDates.some(d => {
        const date = new Date(d);
        const day = date.getDay();
        return day === 0 || day === 5 || day === 6;
      });
      if (hasWeekend) hourlyWithWeekend = SERVICE_PRICING.short_term.day_care.weekend_hourly;
    }
    hourlyRateOnly = hourlyWithWeekend;
    baseRate = hourlyWithWeekend * totalHours;
    serviceFee = SERVICE_PRICING.short_term.day_care.service_fee;
  }

  // 2. Add-ons
  // Cooking (Short Term: R100 per day)
  if (services.cooking && ['emergency', 'date_night', 'date_day', 'school_holiday'].includes(bookingType)) {
    const days = Math.max(1, selectedDates.length);
    const cost = SERVICE_PRICING.add_ons.cooking.short_term_daily * days;
    addOns.push({ name: 'Cooking', price: cost, totalCost: cost, hourlyRate: 0 });
  }

  // Light Housekeeping
  if (services.lightHousekeeping) {
    const sizeKey = normalizeHomeSize(homeSize);
    const dailyRate = SERVICE_PRICING.add_ons.light_housekeeping[sizeKey];
    const days = Math.max(1, selectedDates.length);
    const cost = dailyRate * days;
    addOns.push({ name: `Light Housekeeping (${sizeKey.replace('_', ' ')})`, price: cost, totalCost: cost, hourlyRate: 0 });
  }

  if (services.specialNeeds) {
    addOns.push({ name: 'Diverse Ability Support', price: 0, totalCost: 0, hourlyRate: 0 });
  }

  const addOnsTotal = addOns.reduce((sum, item) => sum + item.price, 0);

  return {
    baseRate,
    baseHourlyRate: hourlyRateOnly,
    addOns,
    services: addOns,
    subtotal: baseRate + addOnsTotal,
    serviceFee,
    total: baseRate + addOnsTotal + serviceFee,
    totalHours,
    totalDays: selectedDates.length,
    hourlyRate: totalHours ? ((baseRate + addOnsTotal) / totalHours) : 0
  };
};

export const calculateDailyPricing = (
  selectedDates: string[],
  bookingType: string,
  homeSize?: string,
  services: {
    cooking?: boolean;
    specialNeeds?: boolean;
    drivingSupport?: boolean;
    lightHousekeeping?: boolean;
    petCare?: boolean;
  } = {},
  gapCoverageType: 'normal' | 'busy_months' | 'promotional' | 'international' | 'sa_replacement' | 'sa_going_away' = 'normal',
  isPromotional: boolean = false
): DailyPricingResult => {
  // Gap Coverage (temporary_support) uses tiered pricing calculation
  if (bookingType === 'temporary_support') {
    return calculateGapCoveragePricing(selectedDates, homeSize, services, gapCoverageType, isPromotional);
  }

  // Legacy daily rate calculation for other booking types (if any)
  const weekdayRate = SERVICE_PRICING.short_term.gap_coverage.weekday_rate;
  const weekendRate = SERVICE_PRICING.short_term.gap_coverage.weekend_rate;

  const breakdown: Array<{ date: string; isWeekend: boolean; rate: number }> = [];
  let daysTotal = 0;

  selectedDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
    const rate = isWeekend ? weekendRate : weekdayRate;
    breakdown.push({ date: dateStr, isWeekend, rate });
    daysTotal += rate;
  });

  const baseRate = daysTotal;
  const addOns: Array<{ name: string; price: number }> = [];

  // Cooking for other daily bookings
  if (services.cooking) {
    const days = Math.max(1, selectedDates.length);
    addOns.push({ name: 'Cooking', price: SERVICE_PRICING.add_ons.cooking.short_term_daily * days });
  }

  const addOnsTotal = addOns.reduce((sum, item) => sum + item.price, 0);

  return {
    baseRate,
    addOns,
    services: addOns,
    subtotal: baseRate + addOnsTotal,
    serviceFee: 0,
    total: baseRate + addOnsTotal,
    totalDays: selectedDates.length,
    breakdown
  };
};

// New function for Gap Coverage tiered pricing
const calculateGapCoveragePricing = (
  selectedDates: string[],
  homeSize?: string,
  services: {
    cooking?: boolean;
    specialNeeds?: boolean;
    drivingSupport?: boolean;
    lightHousekeeping?: boolean;
    petCare?: boolean;
  } = {},
  gapCoverageType: 'normal' | 'busy_months' | 'promotional' | 'international' | 'sa_replacement' | 'sa_going_away' = 'normal',
  isPromotional: boolean = false
): DailyPricingResult => {
  const sizeKey = normalizeHomeSize(homeSize);
  
  // Get monthly rate based on home size (sleep-out arrangement = live_out)
  const monthlyRate = SERVICE_PRICING.long_term.base_rates[sizeKey]?.live_out || 
                      SERVICE_PRICING.long_term.base_rates.family_hub.live_out;
  
  // Calculate add-ons (monthly rates for prorata calculation)
  const addOns: Array<{ name: string; price: number }> = [];
  
  // Cooking (monthly) - FREE for Monumental Manor and Epic Estates
  if (services.cooking) {
    if (sizeKey === 'monumental_manor' || sizeKey === 'epic_estates') {
      addOns.push({ name: 'Cooking (Included)', price: 0 });
    } else {
      const cookingMonthly = SERVICE_PRICING.add_ons.cooking.long_term_monthly;
      addOns.push({ name: 'Cooking', price: cookingMonthly });
    }
  }
  
  // Light Housekeeping (monthly based on home size) - FREE for Monumental Manor and Epic Estates in Gap Coverage
  if (services.lightHousekeeping) {
    if (sizeKey === 'monumental_manor' || sizeKey === 'epic_estates') {
      addOns.push({ 
        name: `Light Housekeeping (${sizeKey.replace('_', ' ')}) (Included)`, 
        price: 0 
      });
    } else {
      const dailyRate = SERVICE_PRICING.add_ons.light_housekeeping[sizeKey] || 
                        SERVICE_PRICING.add_ons.light_housekeeping.family_hub;
      const monthlyHousekeeping = dailyRate * 30;
      addOns.push({ 
        name: `Light Housekeeping (${sizeKey.replace('_', ' ')})`, 
        price: monthlyHousekeeping 
      });
    }
  }
  
  // Diverse Ability Support (monthly)
  if (services.specialNeeds) {
    const diverseAbilityMonthly = SERVICE_PRICING.add_ons.diverse_ability.long_term_monthly;
    addOns.push({ name: 'Diverse Ability Support', price: diverseAbilityMonthly });
  }
  
  // Driving Support (monthly) - FREE for Monumental Manor and Epic Estates
  if (services.drivingSupport) {
    if (sizeKey === 'monumental_manor' || sizeKey === 'epic_estates') {
      addOns.push({ name: 'Driving Support (Included)', price: 0 });
    } else {
      const drivingMonthly = SERVICE_PRICING.add_ons.driving.long_term_monthly;
      addOns.push({ name: 'Driving Support', price: drivingMonthly });
    }
  }
  
  const addOnsTotal = addOns.reduce((sum, item) => sum + item.price, 0);
  const totalMonthlyFee = monthlyRate + addOnsTotal;
  
  const prorataDays = selectedDates.length;
  
  // Calculate placement fee based on tier
  const placementFee = calculatePlacementFeeForGapCoverage(prorataDays, gapCoverageType, isPromotional);
  
  // Calculate service fee per day using new formula: (Monthly base + Add-ons) / 31
  const serviceFeePerDay = calculateServiceFeePerDayForGapCoverage(
    prorataDays,
    monthlyRate,
    addOnsTotal,
    gapCoverageType,
    isPromotional
  );
  
  // Total service fee = service fee per day × number of days
  const totalServiceFee = serviceFeePerDay * prorataDays;
  
  // Create breakdown for display
  const breakdown: Array<{ date: string; isWeekend: boolean; rate: number }> = 
    selectedDates.map(dateStr => {
      const date = new Date(dateStr);
      const day = date.getDay();
      const isWeekend = day === 0 || day === 5 || day === 6;
      return { date: dateStr, isWeekend, rate: serviceFeePerDay };
    });
  
  return {
    baseRate: monthlyRate, // Full monthly rate for reference
    addOns,
    services: addOns,
    subtotal: totalServiceFee,
    serviceFee: 0, // Service fee is included in subtotal
    total: totalServiceFee, // Total service fee (payable at end)
    totalDays: prorataDays,
    breakdown,
    placementFee, // Placement fee (payable first)
    prorataMonthlyRate: monthlyRate,
    prorataAmount: totalServiceFee,
    prorataDays,
    prorataMultiplier: prorataDays / 31, // Using 31 days as per formula
    serviceFeePerDay, // Service fee per day for reference
    gapCoverageType, // Store the type for payment processing
    isPromotional // Store promotional flag for payment terms
  };
};

export const calculateLongTermPricing = (
  homeSize: string = 'family_hub',
  livingArrangement: string = 'live_out',
  childrenAges: string[] = [],
  otherDependents: number = 0,
  services: {
    cooking?: boolean;
    specialNeeds?: boolean;
    drivingSupport?: boolean;
    backupNanny?: boolean;
  } = {}
): LongTermPricingResult => {
  const sizeKey = normalizeHomeSize(homeSize);
  // Handle 'live-in', 'live_in', 'live-out', 'live_out'
  const arrangementClean = livingArrangement.toLowerCase().replace('-', '_');
  const isLiveIn = arrangementClean === 'live_in';

  const baseRate = isLiveIn
    ? SERVICE_PRICING.long_term.base_rates[sizeKey]?.live_in || SERVICE_PRICING.long_term.base_rates.family_hub.live_in
    : SERVICE_PRICING.long_term.base_rates[sizeKey]?.live_out || SERVICE_PRICING.long_term.base_rates.family_hub.live_out;

  const addOns: Array<{ name: string; price: number }> = [];

  if (childrenAges.length > SERVICE_PRICING.add_ons.child_surcharge.threshold) {
    const extra = childrenAges.length - SERVICE_PRICING.add_ons.child_surcharge.threshold;
    addOns.push({
      name: `Additional Children (${extra})`,
      price: extra * SERVICE_PRICING.add_ons.child_surcharge.amount
    });
  }

  if (otherDependents > SERVICE_PRICING.add_ons.adult_occupant_surcharge.threshold) {
    const extra = otherDependents - SERVICE_PRICING.add_ons.adult_occupant_surcharge.threshold;
    addOns.push({
      name: `Additional Occupants (${extra})`,
      price: extra * SERVICE_PRICING.add_ons.adult_occupant_surcharge.amount
    });
  }

  if (services.specialNeeds) {
    addOns.push({
      name: 'Diverse Ability Support',
      price: SERVICE_PRICING.add_ons.diverse_ability.long_term_monthly
    });
  }

  if (services.cooking) {
    if (sizeKey === 'monumental_manor' || sizeKey === 'epic_estates') {
      addOns.push({ name: 'Cooking (Included)', price: 0 });
    } else {
      addOns.push({ name: 'Cooking', price: SERVICE_PRICING.add_ons.cooking.long_term_monthly });
    }
  }

  if (services.drivingSupport) {
    if (sizeKey === 'monumental_manor' || sizeKey === 'epic_estates') {
      addOns.push({ name: 'Driving (Included)', price: 0 });
    } else {
      addOns.push({ name: 'Driving', price: SERVICE_PRICING.add_ons.driving.long_term_monthly });
    }
  }

  const addOnsTotal = addOns.reduce((sum, item) => sum + item.price, 0);
  const totalMonthly = baseRate + addOnsTotal;

  let placementFee = SERVICE_PRICING.long_term.placement_fee.standard;
  if (['grand_estate', 'monumental_manor', 'epic_estates'].includes(sizeKey)) {
    placementFee = totalMonthly * SERVICE_PRICING.long_term.placement_fee.premium_percentage;
  }

  // Annual Bonus: Client contribution (5% of Nanny's monthly income/rate)
  const bonusContribution = totalMonthly * 0.05;

  return {
    baseRate,
    addOns,
    total: totalMonthly,
    placementFee,
    bonusContribution,
    monthlyBreakdown: {
      baseService: baseRate,
      addOnServices: addOnsTotal,
      totalMonthly
    }
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const validateTemporarySupportDates = (selectedDates: string[]): boolean => {
  return selectedDates && selectedDates.length >= SERVICE_PRICING.short_term.gap_coverage.min_days;
};

export const calculateBookingDuration = (startDate: string, endDate?: string): number => {
  if (!endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
};

// Compatibility for existing calls
export const getBookingTypeRate = (
  bookingType: string,
  homeSize?: string,
  selectedDates?: string[],
  livingArrangement?: string,
  childrenAges?: string[],
  otherDependents?: number,
  services?: any
): { base: number; description: string } => {
  // Suppress unused vars check by using them or ignoring
  void selectedDates;
  void childrenAges;
  void otherDependents;
  void services;

  if (bookingType === 'long_term') {
    const pricing = calculateLongTermPricing(homeSize, livingArrangement, childrenAges, otherDependents, services);
    return { base: pricing.baseRate, description: `Base: R${pricing.baseRate}/month` };
  }

  if (bookingType === 'temporary_support') {
    // Weekday R280/Day, Weekend R350/Day
    // Just return weekday rate as base representation
    return { base: 280, description: 'From R280/day' };
  }

  // Short Term
  if (bookingType === 'emergency') return { base: 80, description: 'R80/hour' };
  if (bookingType === 'date_night') return { base: 120, description: 'R120/hour' };
  if (['date_day', 'day_care', 'school_holiday'].includes(bookingType)) return { base: 40, description: 'From R40/hour' };

  return { base: 0, description: 'Custom' };
};

// Deprecated or Unused identifiers
export const isHourlyBasedBooking = (bookingType: string): boolean => {
  return ['emergency', 'date_night', 'date_day', 'school_holiday'].includes(bookingType);
};

export const isDailyBasedBooking = (bookingType: string): boolean => {
  return ['temporary_support'].includes(bookingType);
};