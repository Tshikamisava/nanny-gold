import { UserPreferences } from '@/types/booking';

// Comprehensive booking validation and data recovery utilities
export const validateBookingData = (preferences: UserPreferences, selectedNanny: any) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log('🔍 Validating booking data:', {
    durationType: preferences.durationType,
    bookingSubType: preferences.bookingSubType,
    livingArrangement: preferences.livingArrangement,
    homeSize: preferences.homeSize,
    hasNanny: !!selectedNanny
  });

  // Critical validation - booking type classification
  if (!preferences.durationType && !preferences.bookingSubType) {
    errors.push('Missing booking type information');
  }

  // Long-term booking specific validations
  if (isLongTermBooking(preferences)) {
    if (!preferences.livingArrangement) {
      errors.push('Living arrangement not specified for long-term booking');
    }
    if (!preferences.homeSize) {
      errors.push('Home size not specified for long-term booking');
    }
  }

  // Nanny selection validation
  if (!selectedNanny) {
    warnings.push('No nanny selected');
  } else if (!selectedNanny.profiles) {
    warnings.push('Selected nanny missing profile data');
  }

  return { errors, warnings, isValid: errors.length === 0 };
};

// Robust booking type classification with comprehensive fallbacks
export const isLongTermBooking = (preferences: UserPreferences): boolean => {
  // Primary check: explicit durationType
  if (preferences.durationType === 'long_term') {
    return true;
  }
  
  // Secondary check: exclude known short-term booking types
  const shortTermTypes = ['date_night', 'date_day', 'emergency', 'temporary_support', 'school_holiday'];
  if (preferences.bookingSubType && shortTermTypes.includes(preferences.bookingSubType)) {
    return false;
  }
  
  // Tertiary check: if durationType is explicitly short_term
  if (preferences.durationType === 'short_term') {
    return false;
  }
  
  // Quaternary check: presence of long-term indicators
  if (preferences.livingArrangement && preferences.homeSize) {
    return true;
  }
  
  // Final fallback: Check URL or localStorage for booking flow context
  try {
    const urlPath = window.location.pathname;
    const bookingFlow = localStorage.getItem('bookingFlow');
    
    if (urlPath.includes('living-arrangement') || bookingFlow === 'long-term') {
      return true;
    }
  } catch (error) {
    console.error('Error checking booking flow context:', error);
  }
  
  // Default to false if we can't determine
  console.warn('⚠️ Could not determine booking type, defaulting to short-term');
  return false;
};

// Enhanced data recovery mechanisms
export const recoverBookingData = (): Partial<UserPreferences> => {
  const recovered: Partial<UserPreferences> = {};
  
  try {
    // Recover from localStorage
    const savedPreferences = localStorage.getItem('bookingPreferences');
    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      Object.assign(recovered, parsed);
      console.log('✅ Recovered preferences from localStorage');
    }
    
    // Recover booking flow context
    const bookingFlow = localStorage.getItem('bookingFlow');
    if (bookingFlow === 'long-term') {
      recovered.durationType = 'long_term';
    }
    
    // Recover from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type')) {
      recovered.bookingSubType = urlParams.get('type') as any;
    }
    
  } catch (error) {
    console.error('❌ Error recovering booking data:', error);
  }
  
  return recovered;
};

// Backup critical booking data to localStorage
export const backupBookingData = (preferences: UserPreferences, selectedNanny: any) => {
  try {
    localStorage.setItem('bookingPreferences', JSON.stringify(preferences));
    
    if (selectedNanny) {
      localStorage.setItem('selectedNanny', JSON.stringify({
        id: selectedNanny.id,
        profiles: selectedNanny.profiles,
        services: selectedNanny.services
      }));
    }
    
    // Store booking flow context
    if (isLongTermBooking(preferences)) {
      localStorage.setItem('bookingFlow', 'long-term');
    } else {
      localStorage.setItem('bookingFlow', 'short-term');
    }
    
    console.log('💾 Booking data backed up to localStorage');
  } catch (error) {
    console.error('❌ Error backing up booking data:', error);
  }
};

// Recover nanny selection data
export const recoverNannyData = () => {
  try {
    const savedNanny = localStorage.getItem('selectedNanny');
    if (savedNanny) {
      const parsed = JSON.parse(savedNanny);
      console.log('✅ Recovered nanny data from localStorage');
      return parsed;
    }
  } catch (error) {
    console.error('❌ Error recovering nanny data:', error);
  }
  return null;
};

// Service selection validation and recovery
export const validateAndRecoverServices = (preferences: UserPreferences) => {
  const services = {
    cooking: preferences.cooking || false,
    specialNeeds: preferences.specialNeeds || false,
    drivingSupport: preferences.drivingSupport || false,
    lightHousekeeping: preferences.lightHousekeeping || false,
    ecdTraining: preferences.ecdTraining || false,
    montessori: preferences.montessori || false,
    backupNanny: preferences.backupNanny || false
  };
  
  // Check for service mappings from other preference fields
  if (preferences.childcareFocusAreas?.includes('food-prep') || 
      preferences.householdSupport?.includes('food-prep')) {
    services.cooking = true;
  }
  
  if (preferences.householdSupport?.includes('light-housekeeping')) {
    services.lightHousekeeping = true;
  }
  
  console.log('🔧 Validated services:', services);
  return services;
};

// Runtime assertions for critical booking flow points
export const assertBookingIntegrity = (preferences: UserPreferences, selectedNanny: any, context: string) => {
  console.log(`🔍 Asserting booking integrity at: ${context}`);
  
  const validation = validateBookingData(preferences, selectedNanny);
  
  if (validation.errors.length > 0) {
    console.error(`❌ Booking integrity check failed at ${context}:`, validation.errors);
    
    // Attempt data recovery
    const recovered = recoverBookingData();
    const recoveredNanny = recoverNannyData();
    
    return {
      isValid: false,
      errors: validation.errors,
      recovered,
      recoveredNanny
    };
  }
  
  console.log(`✅ Booking integrity check passed at ${context}`);
  return { isValid: true, errors: [], recovered: null, recoveredNanny: null };
};

// Additional functions for compatibility with existing components
export const getBookingTypeRecommendation = (desiredDate: Date): {
  recommended: 'regular' | 'emergency' | 'none';
  reason: string;
  alternatives?: string[];
} => {
  const now = new Date();
  const timeDiff = desiredDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff < 0) {
    return {
      recommended: 'none',
      reason: 'Cannot book for past dates',
      alternatives: ['Please select a future date']
    };
  }
  
  if (hoursDiff >= 24) {
    return {
      recommended: 'regular',
      reason: 'Regular booking recommended with 24+ hours notice',
      alternatives: ['Standard rates apply', 'Full nanny selection available']
    };
  }
  
  if (isEmergencyBookingTimeWindow()) {
    return {
      recommended: 'emergency',
      reason: 'Emergency booking available now (24/7)',
      alternatives: ['Premium rates apply', '2-hour arrival time', 'Minimum 5-hour booking']
    };
  }
  
  return {
    recommended: 'none',
    reason: 'Emergency bookings available 24/7 for same-day service',
    alternatives: ['Book for tomorrow with regular booking']
  };
};

export const isEmergencyBookingTimeWindow = () => {
  // Emergency bookings available 24/7
  // Nannies need 2 hours to arrive, minimum 5-hour booking
  return true;
};

export const getRecommendedServiceType = (duration: number): 'short_term' | 'long_term' => {
  // Duration is in days
  if (duration >= 30) {
    return 'long_term';
  }
  return 'short_term';
};

export const getServiceTypeLimits = () => {
  return {
    short_term: { 
      minHours: 4, 
      maxHours: 12, 
      maxDays: 14,
      description: 'Flexible hourly or daily bookings'
    },
    long_term: { 
      minDays: 15, 
      maxDays: 365,
      description: 'Extended arrangements with placement support'
    }
  };
};

export const validateBookingDuration = (preferences: UserPreferences, serviceType: string, selectedNanny?: any): {
  errors: string[];
  warnings: string[];
  isValid: boolean;
} => {
  const result = validateBookingData(preferences, selectedNanny);
  
  // Additional service type specific validation
  if (serviceType === 'short_term') {
    // Add short-term specific validations if needed
  } else if (serviceType === 'long_term') {
    // Add long-term specific validations if needed
  }
  
  return result;
};

export const getNextEmergencyBookingWindow = () => {
  const now = new Date();
  const nextWindow = new Date(now);
  
  if (now.getHours() >= 22) {
    nextWindow.setDate(now.getDate() + 1);
    nextWindow.setHours(6, 0, 0, 0);
  } else if (now.getHours() < 6) {
    nextWindow.setHours(6, 0, 0, 0);
  } else {
    nextWindow.setHours(22, 0, 0, 0);
  }
  
  return nextWindow;
};

/**
 * ✅ Enhanced: Validates stored booking for dashboard and calendar display
 */
export const validateStoredBooking = (booking: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  // Critical field validation
  if (!booking.client_id) {
    errors.push('Missing client_id');
    missingFields.push('client_id');
  }

  if (!booking.nanny_id) {
    errors.push('Missing nanny_id');
    missingFields.push('nanny_id');
  }

  if (!booking.start_date) {
    errors.push('Missing start_date');
    missingFields.push('start_date');
  }

  if (!booking.booking_type) {
    errors.push('Missing booking_type');
    missingFields.push('booking_type');
  }

  if (!booking.status) {
    errors.push('Missing status');
    missingFields.push('status');
  }

  // Validate schedule data for calendar display
  if (!booking.schedule || typeof booking.schedule !== 'object') {
    warnings.push('Missing or invalid schedule data - calendar may not display correctly');
    missingFields.push('schedule');
  } else {
    // Check for time information
    const hasTimeSlots = booking.schedule.timeSlots && Array.isArray(booking.schedule.timeSlots);
    const hasDefaultTime = booking.schedule.defaultStartTime;
    const hasWorkingHours = booking.schedule.workingHours;
    
    if (!hasTimeSlots && !hasDefaultTime && !hasWorkingHours) {
      warnings.push('Schedule missing time information - using default times');
      missingFields.push('schedule.timeSlots/defaultStartTime/workingHours');
    }
  }

  // Validate services data for dashboard display
  if (!booking.services || typeof booking.services !== 'object') {
    warnings.push('Missing services data - dashboard may show incomplete information');
    missingFields.push('services');
  }

  // Financial data validation
  if (booking.base_rate === undefined || booking.base_rate === null) {
    warnings.push('Missing base_rate - pricing information incomplete');
    missingFields.push('base_rate');
  }

  if (booking.total_monthly_cost === undefined || booking.total_monthly_cost === null) {
    warnings.push('Missing total_monthly_cost - pricing information incomplete');
    missingFields.push('total_monthly_cost');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingFields
  };
};

/**
 * ✅ Enhanced: Extracts time information from booking for calendar display
 */
export const extractBookingTimeInfo = (booking: any): { start: string; end: string; hasValidTime: boolean } => {
  const defaultTime = { start: '09:00', end: '17:00', hasValidTime: false };

  if (!booking.schedule) {
    return defaultTime;
  }

  // Check for timeSlots (short-term bookings)
  if (booking.schedule.timeSlots && Array.isArray(booking.schedule.timeSlots) && booking.schedule.timeSlots.length > 0) {
    return {
      start: booking.schedule.timeSlots[0].start || booking.schedule.defaultStartTime || '09:00',
      end: booking.schedule.timeSlots[0].end || booking.schedule.defaultEndTime || '17:00',
      hasValidTime: true
    };
  }

  // Check for default time ranges
  if (booking.schedule.defaultStartTime) {
    return {
      start: booking.schedule.defaultStartTime,
      end: booking.schedule.defaultEndTime || '17:00',
      hasValidTime: true
    };
  }

  // Check for working hours (long-term bookings)
  if (booking.schedule.workingHours) {
    return {
      start: booking.schedule.workingHours.start || '08:00',
      end: booking.schedule.workingHours.end || '17:00',
      hasValidTime: true
    };
  }

  return defaultTime;
};

/**
 * ✅ Enhanced: Gets booking type description for display
 */
export const getBookingTypeLabel = (bookingType: string, livingArrangement?: string): string => {
  switch (bookingType) {
    case 'date_night':
      return 'Date Night Childcare';
    case 'date_day':
      return 'Day Childcare';
    case 'school_holiday':
      return 'School Holiday Care';
    case 'emergency':
      return 'Emergency Childcare';
    case 'long_term':
      const arrangement = livingArrangement === 'live-in' ? 'Live-in' : 'Live-out';
      return `${arrangement} Childcare`;
    default:
      return 'Childcare Session';
  }
};