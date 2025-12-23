import { supabase } from '@/integrations/supabase/client';
import { calculateHourlyPricing, calculateLongTermPricing } from '@/utils/pricingUtils';
import type { TablesInsert } from '@/integrations/supabase/types';

// Helper function to count children (18 years and under)
const countChildren = (childrenAges: string[]): number => {
  return childrenAges.filter(age => {
    // Extract numeric value from age string
    const numericAge = parseFloat(age.match(/\d+(\.\d+)?/)?.[0] || '0');

    // Check if age is in months or years
    if (age.toLowerCase().includes('month')) {
      return numericAge <= 216; // 18 years = 216 months
    } else if (age.toLowerCase().includes('year')) {
      return numericAge <= 18;
    } else {
      // Assume years if no unit specified
      return numericAge <= 18;
    }
  }).length;
};

// Helper function to calculate total hours for all short-term bookings
const calculateTotalHours = (timeSlots: Array<{ start: string; end: string }>, numberOfDates: number): number => {
  const dailyHours = timeSlots.reduce((total, slot) => {
    const start = new Date(`2000-01-01T${slot.start}:00`);
    const end = new Date(`2000-01-01T${slot.end}:00`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  return dailyHours * numberOfDates;
};

// Use the centralized pricing utility instead of duplicate hardcoded logic

export const createBookingFromPreferences = async (preferences: any, nannyId: string, clientId: string) => {
  console.log('🎯 Creating booking with preferences:', preferences);
  console.log('🔍 Critical fields check:', {
    durationType: preferences.durationType,
    bookingSubType: preferences.bookingSubType,
    hasSelectedDates: !!preferences.selectedDates?.length,
    hasTimeSlots: !!preferences.timeSlots?.length,
    homeSize: preferences.homeSize,
    livingArrangement: preferences.livingArrangement
  });
  console.log('🏠 Client home size check for pricing...');
  console.log('👤 Nanny ID:', nannyId, 'Client ID:', clientId);

  // Get client profile to determine home size for pricing
  const { data: clientProfile } = await supabase
    .from('clients')
    .select('home_size') // Use correct database column name
    .eq('id', clientId)
    .single();

  console.log('🏠 Client profile home_size:', clientProfile?.home_size);
  console.log('⏰ Duration type:', preferences.durationType);
  console.log('📋 Booking sub type:', preferences.bookingSubType);

  // ✅ P1: Validate home_size for long-term bookings
  if (preferences.durationType === 'long_term' && !clientProfile?.home_size) {
    console.error('❌ P1: Cannot create long-term booking without home_size');
    throw new Error('Client profile is incomplete. Please update your home size in your profile settings.');
  }

  let pricing = await calculatePricingFromPreferences(preferences, clientProfile?.home_size || undefined);
  console.log('💰 Initial calculated pricing:', pricing);

  // Apply children/dependents surcharge for long-term bookings
  if (preferences.durationType === 'long_term') {
    // Fetch client profile to get children and dependents count
    const { data: fullClientProfile } = await supabase
      .from('clients')
      .select('number_of_children, other_dependents')
      .eq('id', clientId)
      .single();

    if (fullClientProfile) {
      let surcharge = 0;

      // Add R500 for 4th child and each subsequent child
      if (fullClientProfile.number_of_children && fullClientProfile.number_of_children > 3) {
        surcharge += (fullClientProfile.number_of_children - 3) * 500;
      }

      // Add R500 for 3rd dependent and each subsequent dependent
      if (fullClientProfile.other_dependents && fullClientProfile.other_dependents > 2) {
        surcharge += (fullClientProfile.other_dependents - 2) * 500;
      }

      if (surcharge > 0) {
        console.log(`📊 Applying surcharge: R${surcharge} (${fullClientProfile.number_of_children} children, ${fullClientProfile.other_dependents} dependents)`);
        pricing = {
          ...pricing,
          baseRate: pricing.baseRate + surcharge,
          total: pricing.total + surcharge
        };
      }
    }
  }

  console.log('💰 Final pricing with surcharges:', pricing);

  // Determine start and end dates based on booking type
  let startDate: string;
  let endDate: string | null = null;

  if (preferences.durationType === 'short_term' && preferences.selectedDates) {
    const dates = preferences.selectedDates.map((d: string) => new Date(d));
    dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
    startDate = dates[0].toISOString().split('T')[0];
    if (dates.length > 1) {
      endDate = dates[dates.length - 1].toISOString().split('T')[0];
    }
  } else {
    // ✅ P3: Long-term bookings must have future start date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day

    if (preferences.startDate) {
      const prefStartDate = new Date(preferences.startDate);
      prefStartDate.setHours(0, 0, 0, 0);

      // Validate it's in the future
      if (prefStartDate < now) {
        throw new Error('Start date cannot be in the past. Please select a future date.');
      }
      startDate = prefStartDate.toISOString().split('T')[0];
    } else if (preferences.workStartDate) {
      const workStart = new Date(preferences.workStartDate);
      workStart.setHours(0, 0, 0, 0);

      // Validate it's in the future
      if (workStart < now) {
        throw new Error('Work start date cannot be in the past. Please select a future date.');
      }
      startDate = workStart.toISOString().split('T')[0];
    } else {
      // Default to 7 days from now for long-term bookings
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      startDate = futureDate.toISOString().split('T')[0];
    }
  }

  // Determine booking type
  const bookingType = preferences.bookingSubType === 'emergency' ? 'emergency' :
    preferences.bookingSubType === 'date_night' ? 'date_night' :
      preferences.bookingSubType === 'school_holiday' ? 'school_holiday' :
        preferences.durationType === 'short_term' ? 'date_day' :
          preferences.durationType === 'long_term' ? 'long_term' : 'standard';

  // ✅ Enhanced: Build comprehensive booking data with complete metadata for dashboard and calendar
  const bookingData: TablesInsert<'bookings'> = {
    client_id: clientId,
    nanny_id: nannyId,
    status: 'pending',
    start_date: startDate,
    end_date: endDate,
    booking_type: bookingType,
    home_size: clientProfile?.home_size || null, // ✅ P1: Include home_size from client profile
    schedule: preferences.durationType === 'short_term'
      ? {
        selectedDates: preferences.selectedDates,
        timeSlots: preferences.timeSlots,
        bookingType: preferences.bookingSubType,
        numberOfDates: preferences.selectedDates?.length || 1,
        totalHours: pricing.totalHours || 0,
        // Add calculated time ranges for calendar display
        defaultStartTime: preferences.timeSlots?.[0]?.start || '09:00',
        defaultEndTime: preferences.timeSlots?.[0]?.end || '17:00'
      }
      : {
        ...preferences.schedule,
        // For long-term bookings, include standard working hours
        workingHours: {
          start: preferences.timeSlots?.[0]?.start || '08:00',
          end: preferences.timeSlots?.[0]?.end || '17:00'
        }
      },
    living_arrangement: preferences.livingArrangement || 'live-out',
    services: {
      petCare: preferences.petCare || false,
      cooking: preferences.cooking || false,
      specialNeeds: preferences.specialNeeds || false,
      ecdTraining: preferences.ecdTraining || false,
      montessori: preferences.montessori || false,
      drivingSupport: preferences.drivingSupport || false,
      backupNanny: preferences.backupNanny || false,
      durationType: preferences.durationType,
      bookingSubType: preferences.bookingSubType,
      // Add service details for dashboard display
      childrenAges: preferences.childrenAges || [],
      numberOfChildren: countChildren(preferences.childrenAges || []),
      location: preferences.location || '',
      languages: preferences.languages || ''
    },
    base_rate: pricing.baseRate,
    additional_services_cost: pricing.addOns.reduce((sum: number, addon: any) => sum + addon.price, 0),
    total_monthly_cost: pricing.total,
    notes: preferences.durationType === 'short_term'
      ? `Short-term ${preferences.bookingSubType} booking. ${preferences.bookingSubType === 'date_night' ? `Total hours: ${pricing.totalHours || 0}` : `Total days: ${preferences.selectedDates?.length || 0}`}. Time: ${preferences.timeSlots?.[0]?.start || '09:00'} - ${preferences.timeSlots?.[0]?.end || '17:00'}`
      : `Long-term ${preferences.livingArrangement || 'live-out'} arrangement. Working hours: ${preferences.timeSlots?.[0]?.start || '08:00'} - ${preferences.timeSlots?.[0]?.end || '17:00'}`
  };

  console.log('📝 Final booking data being inserted:', bookingData);

  // Prevent duplicate bookings - check for overlapping dates with same nanny
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('id, start_date, end_date, booking_type, status')
    .eq('client_id', clientId)
    .eq('nanny_id', nannyId)
    .in('status', ['pending', 'confirmed', 'active'])
    .order('created_at', { ascending: false });

  if (existingBookings && existingBookings.length > 0) {
    const newStartDate = new Date(startDate);
    const newEndDate = endDate ? new Date(endDate) : null;

    for (const booking of existingBookings) {
      const existingStart = new Date(booking.start_date);
      const existingEnd = booking.end_date ? new Date(booking.end_date) : null;

      // Check if dates overlap
      let hasOverlap = false;

      if (newEndDate && existingEnd) {
        // Both have end dates - check for overlap
        hasOverlap = (newStartDate <= existingEnd && newEndDate >= existingStart);
      } else if (newEndDate || existingEnd) {
        // One has end date, one doesn't - check for overlap
        if (newEndDate) {
          hasOverlap = (newStartDate <= existingStart && newEndDate >= existingStart);
        } else {
          hasOverlap = (newStartDate >= existingStart && existingEnd && newStartDate <= existingEnd);
        }
      } else {
        // Neither has end date (short-term) - check if same start date
        hasOverlap = (newStartDate.toDateString() === existingStart.toDateString());
      }

      if (hasOverlap) {
        console.log('⚠️ Date overlap detected with existing booking:', booking);
        // Phase 3: Improve error message with clear guidance
        throw new Error(
          `You already have a pending ${booking.booking_type} booking with this nanny (${booking.status}). ` +
          `Please complete or cancel it in "My Bookings" before creating a new one.`
        );
      }
    }

    console.log('✅ No date overlaps found. Multiple bookings allowed.');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating booking:', error);
    console.error('❌ Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  // Calculate revenue breakdown and store financial data
  try {
    await calculateAndStoreBookingFinancials(data.id, pricing.total, bookingType, pricing.total);
  } catch (financialError) {
    console.error('Error calculating booking financials:', financialError);
    // Don't fail the booking creation if financial calculation fails
  }

  console.log('Booking created successfully:', data);
  return data;
};

// Function to calculate and store booking financial breakdown
export const calculateAndStoreBookingFinancials = async (
  bookingId: string,
  totalAmount: number,
  bookingType: string,
  _monthlyRateEstimate?: number,
  _bookingDays?: number
) => {
  try {
    // Get booking details including home_size and living_arrangement
    const { data: booking } = await supabase
      .from('bookings')
      .select('start_date, end_date, schedule, home_size, living_arrangement, additional_services_cost')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }





    // Call the database function with new signature (returns JSONB)
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('calculate_booking_revenue', {
        p_booking_id: bookingId,
        p_client_total: totalAmount,
        p_booking_type: bookingType,
        p_living_arrangement: booking.living_arrangement || undefined,
        p_home_size: booking.home_size || undefined,
        p_additional_services_cost: booking.additional_services_cost || 0
      });

    if (revenueError) {
      console.error('Error calculating revenue:', revenueError);
      throw revenueError;
    }

    if (!revenueData || !Array.isArray(revenueData) || revenueData.length === 0) {
      throw new Error('No revenue data returned from calculation');
    }

    // The function returns an array, get the first element
    const revenue = revenueData[0] as {
      fixed_fee: number;
      commission_percent: number;
      commission_amount: number;
      admin_total_revenue: number;
      nanny_earnings: number;
    };

    // Store the financial breakdown
    const { error: insertError } = await supabase
      .from('booking_financials')
      .insert({
        booking_id: bookingId,
        booking_type: bookingType,
        fixed_fee: revenue.fixed_fee,
        commission_percent: revenue.commission_percent,
        commission_amount: revenue.commission_amount,
        admin_total_revenue: revenue.admin_total_revenue,
        nanny_earnings: revenue.nanny_earnings,
        currency: 'ZAR'
      });

    if (insertError) {
      console.error('Error storing booking financials:', insertError);
      throw insertError;
    }

    console.log('Booking financials calculated and stored successfully');
    return revenue;
  } catch (error) {
    console.error('Error in calculateAndStoreBookingFinancials:', error);
    throw error;
  }
};

const calculatePricingFromPreferences = async (preferences: any, homeSize?: string) => {
  console.log('💰 Calculating pricing - Duration:', preferences.durationType, 'Home size:', homeSize);

  if (preferences.durationType === 'short_term') {
    if (!preferences.bookingSubType) {
      throw new Error('Invalid booking configuration: Missing booking type.');
    }

    const result = await calculateHourlyPricing(
      preferences.bookingSubType,
      preferences.timeSlots ? calculateTotalHours(preferences.timeSlots, preferences.selectedDates?.length || 1) : 0,
      {
        cooking: preferences.cooking,
        specialNeeds: preferences.specialNeeds,
        drivingSupport: preferences.drivingSupport,
        lightHousekeeping: preferences.householdSupport?.includes('housekeeping'),
        petCare: preferences.petCare
      },
      preferences.selectedDates || [],
      homeSize
    );

    // Compatibility layout
    return {
      baseRate: result.baseRate,
      addOns: result.addOns,
      total: result.total,
      totalHours: result.totalHours,
      hourlyRate: result.hourlyRate,
      isHourlyBased: true
    };
  }

  // Long Term
  const result = calculateLongTermPricing(
    homeSize || 'family_hub',
    preferences.livingArrangement,
    preferences.childrenAges || [],
    preferences.otherDependents || 0,
    {
      cooking: preferences.cooking || (preferences.householdSupport && preferences.householdSupport.includes('food_prep')),
      specialNeeds: preferences.specialNeeds,
      drivingSupport: preferences.drivingSupport,
      backupNanny: preferences.backupNanny
    }
  );

  return {
    baseRate: result.baseRate,
    addOns: result.addOns,
    total: result.total,
    isHourlyBased: false
  };
};
