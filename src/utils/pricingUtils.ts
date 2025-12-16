import { supabase } from '@/integrations/supabase/client';
import { SERVICE_PRICING } from '@/constants/servicePricing';

export interface HourlyPricingResult {
  baseHourlyRate: number;
  services: Array<{ name: string; hourlyRate: number; totalCost: number }>;
  subtotal: number;
  serviceFee: number;
  emergencySurcharge?: number;
  total: number;
  effectiveHourlyRate: number;
}

export interface LongTermPricingResult {
  baseRate: number;
  addOns: Array<{ name: string; price: number }>;
  total: number;
  placementFee: number;
  monthlyBreakdown: {
    baseService: number;
    addOnServices: number;
    totalMonthly: number;
  };
}

export const calculateHourlyPricing = async (
  bookingType: 'emergency' | 'date_night' | 'date_day' | 'school_holiday',
  totalHours: number,
  services: {
    cooking?: boolean;
    specialNeeds?: boolean;
    drivingSupport?: boolean;
    lightHousekeeping?: boolean;
  },
  selectedDates?: string[],
  homeSize?: string
): Promise<HourlyPricingResult> => {
  const { data, error } = await supabase.functions.invoke('calculate-hourly-pricing', {
    body: {
      bookingType,
      totalHours,
      services,
      selectedDates,
      homeSize // Pass homeSize to edge function
    }
  });

  if (error) {
    console.error('Error calculating hourly pricing:', error);
    throw new Error('Failed to calculate pricing');
  }

  return data;
};

export const calculateLongTermPricing = (
  homeSize: string = 'medium',
  livingArrangement: string = 'live_out',
  childrenAges: string[] = [],
  otherDependents: number = 0,
  services: {
    cooking?: boolean;
    specialNeeds?: boolean;
    drivingSupport?: boolean;
    ecdTraining?: boolean;
    montessori?: boolean;
    backupNanny?: boolean;
    drivingRequired?: boolean;
  } = {}
): LongTermPricingResult => {
  // Updated base rates by home size - NEW PRICING STRUCTURE
  const homeSizeRates: { [key: string]: { live_in: number; live_out: number } } = {
    'pocket_palace': { live_in: 4500, live_out: 4800 },        // <120m2, cosy 2 bedrooms
    'family_hub': { live_in: 6000, live_out: 6800 },           // 120-250m2, comfortable 3-4 bedrooms
    'grand_estate': { live_in: 7000, live_out: 7800 },         // 251-300m2, spacious 3-4 oversized bedrooms
    'monumental_manor': { live_in: 8000, live_out: 9000 },     // 301-360m2, luxurious 5+ oversized bedrooms
    'epic_estates': { live_in: 10000, live_out: 11000 }        // 361m2+, grand luxury living
  };

  // Map legacy database values to proper constants
  const homeSizeMapping: { [key: string]: string } = {
    'small': 'pocket_palace',
    'medium': 'family_hub', 
    'large': 'grand_estate',
    'extra_large': 'monumental_manor',
    // Keep existing proper keys
    'pocket_palace': 'pocket_palace',
    'family_hub': 'family_hub',
    'grand_estate': 'grand_estate',
    'monumental_manor': 'monumental_manor',
    'epic_estates': 'epic_estates'
  };

  const mappedHomeSize = homeSizeMapping[homeSize] || 'family_hub';
  
  // Normalize living arrangement format (handle both 'live-in' and 'live_in')
  // Phase 1: Add null safety to prevent crash when livingArrangement is null
  const normalizedArrangement = (livingArrangement || 'live_out').replace(/-/g, '_').toLowerCase();
  
  console.log(`💰 Calculating long-term pricing: ${homeSize} -> ${mappedHomeSize} (${livingArrangement})`);
  console.log(`📊 Base rates for ${mappedHomeSize}:`, homeSizeRates[mappedHomeSize]);
  console.log(`🔧 Normalized arrangement: ${livingArrangement} -> ${normalizedArrangement}`);

  const homeSizeData = homeSizeRates[mappedHomeSize];
  let baseRate = normalizedArrangement === 'live_in' ? homeSizeData.live_in : homeSizeData.live_out;
  
  console.log(`✅ Selected base rate: R${baseRate} for ${normalizedArrangement}`);

  // Count children (18 years and under)
  const countChildren = (ages: string[]): number => {
    return ages.filter(age => {
      const numericAge = parseFloat(age.match(/\d+(\.\d+)?/)?.[0] || '0');
      if (age.toLowerCase().includes('month')) {
        return numericAge <= 216; // 18 years = 216 months
      } else if (age.toLowerCase().includes('year')) {
        return numericAge <= 18;
      } else {
        return numericAge <= 18; // Assume years if no unit specified
      }
    }).length;
  };

  const numChildren = countChildren(childrenAges);
  
  // Add R500 per child after the 3rd child
  if (numChildren > 3) {
    const extraChildren = numChildren - 3;
    baseRate += extraChildren * 500;
  }
  
  // Add R500 if more than 2 other dependents
  if (otherDependents > 2) {
    baseRate += 500;
  }

  // Service add-ons
  const addOns: Array<{ name: string; price: number }> = [];

  if (services.cooking) {
    addOns.push({ name: SERVICE_PRICING.cooking.name, price: SERVICE_PRICING.cooking.price });
    console.log(`✅ Added cooking support: R${SERVICE_PRICING.cooking.price}/month`);
  }

  if (services.specialNeeds) {
    addOns.push({ name: SERVICE_PRICING.special_needs.name, price: SERVICE_PRICING.special_needs.price });
    console.log(`✅ Added diverse ability support: R${SERVICE_PRICING.special_needs.price}/month`);
  }

  if (services.drivingSupport) {
    addOns.push({ name: SERVICE_PRICING.driving_support.name, price: SERVICE_PRICING.driving_support.price });
    console.log(`✅ Added driving support: R${SERVICE_PRICING.driving_support.price}/month`);
  }

  if (services.ecdTraining) {
    addOns.push({ name: SERVICE_PRICING.ecd_training.name, price: SERVICE_PRICING.ecd_training.price });
  }

  if (services.montessori) {
    addOns.push({ name: SERVICE_PRICING.montessori.name, price: SERVICE_PRICING.montessori.price });
  }

  if (services.backupNanny) {
    addOns.push({ name: SERVICE_PRICING.backup_nanny.name, price: SERVICE_PRICING.backup_nanny.price });
  }

  if (services.drivingRequired) {
    addOns.push({ name: "Transportation Service", price: 2000 });
  }

  // Updated placement fees based on new requirements
  const placementFees = {
    'pocket_palace': 2500,      // Standard homes
    'family_hub': 2500,         // Standard homes
    'grand_estate': (homeSize: string, baseRate: number) => Math.round(baseRate * 0.5), // Premium homes: 50% of monthly rate
    'monumental_manor': (homeSize: string, baseRate: number) => Math.round(baseRate * 0.5), // Premium homes: 50% of monthly rate
    'epic_estates': (homeSize: string, baseRate: number) => Math.round(baseRate * 0.5)   // Premium homes: 50% of monthly rate
  };

  const addOnTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
  const total = baseRate + addOnTotal;
  
  // Calculate placement fee based on home size (UPDATED - include monumental_manor as premium)
  const calculatePlacementFee = (homeSize: string, baseRateOnly: number): number => {
    const mappedSize = homeSize?.toLowerCase().replace(/[- ]/g, '_');
    
    // Flat R2,500 for standard homes
    if (['pocket_palace', 'family_hub'].includes(mappedSize)) {
      return 2500;
    }
    
    // 50% for premium estates only (grand_estate, monumental_manor, epic_estates)
    if (['grand_estate', 'monumental_manor', 'epic_estates'].includes(mappedSize)) {
      return Math.round(baseRateOnly * 0.5);
    }
    
    return 2500;
  };
  
  const placementFee = calculatePlacementFee(mappedHomeSize, baseRate); // Pass baseRate, not total

  return {
    baseRate,
    addOns,
    total,
    placementFee,
    monthlyBreakdown: {
      baseService: baseRate,
      addOnServices: addOnTotal,
      totalMonthly: total
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

export const getBookingTypeRate = (
  bookingType: string, 
  homeSize?: string, 
  selectedDates?: string[], 
  livingArrangement?: string,
  childrenAges?: string[],
  otherDependents?: number,
  services?: {
    cooking?: boolean;
    specialNeeds?: boolean;
    drivingSupport?: boolean;
    ecdTraining?: boolean;
    montessori?: boolean;
    backupNanny?: boolean;
  }
): { base: number; description: string } => {
  // For temporary support (Gap Coverage), check for weekend rates
  if (bookingType === 'temporary_support') {
    let total = 0;
    let weekdayCount = 0;
    let weekendCount = 0;
    
    selectedDates?.forEach((dateStr: string) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend rate
        total += 350;
        weekendCount++;
      } else {
        // Weekday rate  
        total += 280;
        weekdayCount++;
      }
    });
    
    const description = `${weekdayCount} weekdays (R280/day) + ${weekendCount} weekends (R350/day)`;
    return { base: total, description };
  }

  // PHASE 1: Defensive check - prevent calling long-term pricing for short-term bookings
  const shortTermTypes = ['emergency', 'date_night', 'date_day', 'school_holiday', 'temporary_support', 'standard'];
  if (shortTermTypes.includes(bookingType) && !livingArrangement) {
    // This is a short-term booking, return default hourly rate
    const hourlyRates: { [key: string]: number } = {
      'emergency': 80,
      'date_night': 120,
      'date_day': 40,
      'school_holiday': 130,
      'standard': 120
    };
    const rate = hourlyRates[bookingType] || 120;
    return { base: rate, description: `R${rate}/hour` };
  }

  // Long-term booking rates
  if (bookingType === 'long_term') {
    const pricing = calculateLongTermPricing(
      homeSize, 
      livingArrangement, 
      childrenAges || [], 
      otherDependents || 0, 
      services || {}
    );
    return { base: pricing.baseRate, description: `Base: R${pricing.baseRate}/month` };
  }

  // Default hourly rates for short-term bookings
  const hourlyRates: { [key: string]: number } = {
    'emergency': 80,
    'date_night': 120,
    'date_day': 40,
    'school_holiday': 130
  };

  const rate = hourlyRates[bookingType] || 120;
  return { base: rate, description: `R${rate}/hour` };
};

export const isHourlyBasedBooking = (bookingType: string): boolean => {
  return ['emergency', 'date_night', 'date_day', 'school_holiday'].includes(bookingType);
};

export const isDailyBasedBooking = (bookingType: string): boolean => {
  return ['temporary_support'].includes(bookingType);
};

export const validateTemporarySupportDates = (selectedDates: string[]): boolean => {
  return selectedDates && selectedDates.length >= 5; // Minimum 5 consecutive days for Gap Coverage
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
  } = {}
) => {
  if (bookingType !== 'temporary_support') {
    return { total: 0, breakdown: [] };
  }

  let total = 0;
  const breakdown: Array<{ date: string; rate: number; isWeekend: boolean }> = [];

  selectedDates.forEach((dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Include Friday as weekend
    const rate = isWeekend ? 350 : 280; // R350 weekend, R280 weekday
    
    total += rate;
    breakdown.push({
      date: dateStr,
      rate,
      isWeekend
    });
  });

  // Add service costs for each day - updated rates
  const dailyServiceCost = 
    (services.cooking ? 100 : 0) + // R100/day flat rate for all short-term services
    (services.specialNeeds ? 0 : 0) + // R0 additional for diverse ability support
    (services.drivingSupport ? 0 : 0); // Driving support not applicable for Gap Coverage

  // Light Housekeeping based on home size (daily rates)
  if (services.lightHousekeeping && homeSize) {
    let dailyHousekeepingRate = 100; // Default for family_hub
    
    switch (homeSize) {
      case 'pocket_palace':
        dailyHousekeepingRate = 80;
        break;
      case 'family_hub':
        dailyHousekeepingRate = 100;
        break;
      case 'grand_retreat':
        dailyHousekeepingRate = 120;
        break;
      case 'epic_estates':
        dailyHousekeepingRate = 300;
        break;
    }
    
    total += dailyHousekeepingRate * selectedDates.length;
  }

  if (dailyServiceCost > 0) {
    total += dailyServiceCost * selectedDates.length;
  }

  // No service fee for Gap Coverage (waived per requirements)
  return { total, breakdown };
};

export const calculateBookingDuration = (startDate: string, endDate?: string): number => {
  if (!endDate) return 1;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays + 1); // Include both start and end dates
};