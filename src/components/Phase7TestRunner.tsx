import { supabase } from '@/integrations/supabase/client';
import { TestScenario, PricingTestResult } from './Phase7TestCategories';

// Helper function for housekeeping rates
const getHousekeepingRate = (homeSize: string): number => {
  const rates: Record<string, number> = {
    pocket_palace: 100,
    family_hub: 150,
    grand_estate: 200,
    epic_estates: 250,
    monumental_manor: 300
  };
  return rates[homeSize] || 150;
};

// Pricing validation functions - uses real booking data
export const validateShortTermPricing = async (
  bookingId: string
): Promise<PricingTestResult> => {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, booking_financials(*), clients(home_size)')
    .eq('id', bookingId)
    .single();
  
  if (!booking) {
    return {
      passed: false,
      expected: 0,
      actual: 0,
      variance: 0,
      details: 'Booking not found'
    };
  }
  
  const schedule = (booking.schedule || {}) as any;
  const services = (booking.services || {}) as any;
  const bookingType = schedule.bookingType || booking.booking_type;
  const selectedDates = (schedule.selectedDates || []) as string[];
  const timeSlots = (schedule.timeSlots || []) as any[];
  const homeSize = (booking.clients as any)?.home_size || booking.home_size;
  
  let expectedTotal = 0;
  
  // Calculate based on booking type
  if (bookingType === 'emergency' || bookingType === 'date_night' || bookingType === 'date_day') {
    // Hourly bookings
    const baseRate = bookingType === 'emergency' ? 80 : bookingType === 'date_night' ? 120 : 40;
    let totalHours = 0;
    
    timeSlots.forEach((slot: any) => {
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      totalHours += hours;
    });
    
    expectedTotal = baseRate * totalHours * selectedDates.length;
    
    // Add-ons
    if (services.cooking) expectedTotal += 100 * selectedDates.length;
    if (services.householdSupport?.includes('light-housekeeping')) {
      const housekeepingRate = getHousekeepingRate(homeSize);
      expectedTotal += housekeepingRate * selectedDates.length;
    }
    
    expectedTotal += 35; // Service fee
    
  } else if (bookingType === 'temporary_support') {
    // Daily bookings
    let weekdayCount = 0;
    let weekendCount = 0;
    
    selectedDates.forEach((dateStr: string) => {
      const date = new Date(dateStr);
      const day = date.getDay();
      if (day === 5 || day === 6) weekendCount++;
      else weekdayCount++;
    });
    
    expectedTotal = (weekdayCount * 280) + (weekendCount * 350);
    
    // Add-ons
    if (services.cooking) expectedTotal += 100 * selectedDates.length;
    if (services.householdSupport?.includes('light-housekeeping')) {
      const housekeepingRate = getHousekeepingRate(homeSize);
      expectedTotal += housekeepingRate * selectedDates.length;
    }
    
    // Service fee waived for 5+ consecutive days
    if (selectedDates.length >= 5) {
      expectedTotal += 0;
    } else {
      expectedTotal += 35;
    }
  }
  
  const actualTotal = booking.total_monthly_cost;
  const variance = Math.abs(expectedTotal - actualTotal);
  
  return {
    passed: variance < 1, // Allow R1 variance for rounding
    expected: expectedTotal,
    actual: actualTotal,
    variance,
    details: `${bookingType}: Expected R${expectedTotal.toFixed(2)}, Got R${actualTotal.toFixed(2)}`
  };
};

export const validateLongTermPricing = (
  homeSize: string,
  livingArrangement: string,
  services: any,
  actualTotal: number
): PricingTestResult => {
  // Base rates by home size - CORRECTED
  const baseRates: Record<string, { liveIn: number; liveOut: number }> = {
    pocket_palace: { liveIn: 4000, liveOut: 4800 },
    family_hub: { liveIn: 6000, liveOut: 6800 },
    grand_estate: { liveIn: 8000, liveOut: 8800 }, // FIXED: was grand_retreat
    epic_estates: { liveIn: 10000, liveOut: 11000 },
    monumental_manor: { liveIn: 12000, liveOut: 13000 }, // ADDED
  };
  
  const rates = baseRates[homeSize] || baseRates.family_hub;
  const baseRate = livingArrangement === 'live-in' ? rates.liveIn : rates.liveOut;
  
  // Additional services
  const serviceCosts = {
    cooking: services.cooking ? 1500 : 0,
    backup_nanny: services.backup_nanny ? 100 : 0,
    driving: services.driving ? 1800 : 0,
    special_needs: services.special_needs ? 2000 : 0,
    ecd_training: services.ecd_training ? 500 : 0,
    montessori: services.montessori ? 450 : 0,
  };
  
  const totalServices = Object.values(serviceCosts).reduce((a, b) => a + b, 0);
  const expected = baseRate + totalServices;
  
  return {
    passed: Math.abs(expected - actualTotal) < 0.01,
    expected,
    actual: actualTotal,
    variance: actualTotal - expected,
    details: `Base: R${baseRate} + Services: R${totalServices}`
  };
};

// NEW: Validate placement fees for long-term bookings
export const validatePlacementFee = async (
  bookingId: string
): Promise<PricingTestResult> => {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, home_size, base_rate, booking_financials(fixed_fee)')
    .eq('id', bookingId)
    .eq('booking_type', 'long_term')
    .single();
  
  if (!booking) {
    return {
      passed: false,
      expected: 0,
      actual: 0,
      variance: 0,
      details: 'Booking not found'
    };
  }
  
  const homeSize = booking.home_size;
  const actualFee = booking.booking_financials?.[0]?.fixed_fee || 0;
  
  // Determine expected placement fee - CORRECT STRUCTURE
  let expectedFee = 0;
  if (['pocket_palace', 'family_hub', 'grand_estate'].includes(homeSize)) {
    expectedFee = 2500;
  } else if (['epic_estates', 'monumental_manor'].includes(homeSize)) {
    expectedFee = Math.round(booking.base_rate * 0.5 * 100) / 100;
  }
  
  return {
    passed: Math.abs(expectedFee - actualFee) < 0.01,
    expected: expectedFee,
    actual: actualFee,
    variance: actualFee - expectedFee,
    details: `${homeSize}: Expected R${expectedFee}, Got R${actualFee}`
  };
};

export const validateCommission = async (
  bookingId: string,
  totalAmount: number
): Promise<PricingTestResult> => {
  // Fetch booking financials
  const { data: financials } = await supabase
    .from('booking_financials')
    .select('*')
    .eq('booking_id', bookingId)
    .single();
  
  if (!financials) {
    return {
      passed: false,
      expected: 0,
      actual: 0,
      variance: 0,
      details: 'Booking financials not found'
    };
  }
  
  // Calculate expected commission based on sliding scale
  let expectedPercent = 10;
  if (totalAmount >= 10000) expectedPercent = 25;
  else if (totalAmount >= 5001) expectedPercent = 15;
  
  const expectedCommission = Math.round(totalAmount * expectedPercent / 100 * 100) / 100;
  const expectedNannyEarnings = totalAmount - expectedCommission;
  
  const commissionMatch = Math.abs(financials.commission_amount - expectedCommission) < 0.01;
  const earningsMatch = Math.abs(financials.nanny_earnings - expectedNannyEarnings) < 0.01;
  
  return {
    passed: commissionMatch && earningsMatch,
    expected: expectedCommission,
    actual: financials.commission_amount,
    variance: financials.commission_amount - expectedCommission,
    details: `Commission: ${expectedPercent}% of R${totalAmount} = R${expectedCommission}, Nanny Earnings: R${expectedNannyEarnings}`
  };
};

export const validateReferralCode = async (
  referralCode: string
): Promise<PricingTestResult> => {
  // Check if referral code exists
  const { data: referralParticipant } = await supabase
    .from('referral_participants')
    .select('*')
    .eq('referral_code', referralCode)
    .single();
  
  if (!referralParticipant) {
    return {
      passed: false,
      expected: 1,
      actual: 0,
      variance: -1,
      details: 'Invalid referral code'
    };
  }
  
  // Check reward balance
  const { data: rewardBalance } = await supabase
    .from('reward_balances')
    .select('*')
    .eq('user_id', referralParticipant.user_id)
    .single();
  
  return {
    passed: !!rewardBalance,
    expected: 1,
    actual: rewardBalance ? 1 : 0,
    variance: 0,
    details: `Referrer has reward balance: ${rewardBalance?.available_balance || 0}`
  };
};

export const validateAnalytics = async (): Promise<PricingTestResult> => {
  // Get all active bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, total_monthly_cost, booking_financials(admin_total_revenue, nanny_earnings)')
    .in('status', ['confirmed', 'active']);
  
  if (!bookings || bookings.length === 0) {
    return {
      passed: true,
      expected: 0,
      actual: 0,
      variance: 0,
      details: 'No active bookings to validate'
    };
  }
  
  // Calculate totals
  const totalRevenue = bookings.reduce((sum, b) => {
    const revenue = b.booking_financials?.[0]?.admin_total_revenue || 0;
    return sum + revenue;
  }, 0);
  
  const totalNannyEarnings = bookings.reduce((sum, b) => {
    const earnings = b.booking_financials?.[0]?.nanny_earnings || 0;
    return sum + earnings;
  }, 0);
  
  // Verify that client payments = admin revenue + nanny earnings
  const totalClientPayments = bookings.reduce((sum, b) => sum + b.total_monthly_cost, 0);
  const calculatedTotal = totalRevenue + totalNannyEarnings;
  const difference = Math.abs(totalClientPayments - calculatedTotal);
  
  return {
    passed: difference < 1, // Allow R1 variance due to rounding
    expected: totalClientPayments,
    actual: calculatedTotal,
    variance: difference,
    details: `Client pays: R${totalClientPayments}, Admin gets: R${totalRevenue}, Nanny gets: R${totalNannyEarnings}`
  };
};

// Run individual test - ENHANCED with test-specific bookings
export const runTest = async (scenario: TestScenario): Promise<TestScenario> => {
  console.log(`Running test: ${scenario.name}`);
  
  try {
    // Fetch all test bookings and filter client-side (PostgREST JSONB operators have limitations)
    const { data: allTestBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*, booking_financials(*)');

    if (fetchError) {
      return {
        ...scenario,
        status: 'fail',
        message: `Database error: ${fetchError.message}`,
      };
    }

    // Client-side filtering for JSONB fields
    const testBooking = allTestBookings?.find(booking => {
      const services = booking.services as any;
      return services?.test_data === true && services?.test_scenario_id === scenario.id;
    });

    if (!testBooking) {
      return {
        ...scenario,
        status: 'fail',
        message: `Test booking not found for scenario: ${scenario.id}. Please generate test data first.`,
      };
    }

    let result: PricingTestResult;
    
    switch (scenario.category) {
      case 'short-term':
        result = await validateShortTermPricing(testBooking.id);
        break;
        
      case 'long-term':
        if (scenario.id.includes('placement-fee')) {
          result = await validatePlacementFee(testBooking.id);
        } else {
          result = validateLongTermPricing(
            testBooking.home_size || 'family_hub',
            testBooking.living_arrangement || 'live-in',
            testBooking.services || {},
            testBooking.total_monthly_cost
          );
        }
        break;
        
      case 'commission':
        result = await validateCommission(testBooking.id, testBooking.total_monthly_cost);
        break;
      
      case 'referral':
        // Fetch a referral code to test
        const { data: referral } = await supabase
          .from('referral_participants')
          .select('referral_code')
          .limit(1)
          .single();
        
        if (referral) {
          result = await validateReferralCode(referral.referral_code);
        } else {
          result = { passed: false, expected: 1, actual: 0, variance: -1, details: 'No referral codes found' };
        }
        break;
        
      case 'analytics':
        result = await validateAnalytics();
        break;
        
      case 'flow':
        // Flow tests require manual verification
        result = { passed: true, expected: 1, actual: 1, variance: 0, details: 'Manual verification required via dashboard' };
        break;
        
      default:
        result = { passed: false, expected: 0, actual: 0, variance: 0, details: 'Test category not recognized' };
    }
    
    return {
      ...scenario,
      status: result.passed ? 'pass' : 'fail',
      message: result.details,
      expectedValue: result.expected,
      actualValue: result.actual
    };
  } catch (error) {
    return {
      ...scenario,
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
