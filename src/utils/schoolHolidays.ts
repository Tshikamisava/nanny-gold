// South African School Holiday Utils
import { format, isWithinInterval, parseISO } from 'date-fns';

// Development mode bypass flag
const DEV_MODE = process.env.NODE_ENV === 'development' || 
                import.meta.env.DEV ||
                typeof window !== 'undefined' && window.location.hostname === 'localhost';

// South African School Holiday Periods for 2024-2025
// Based on Department of Basic Education calendar and typical private school schedules
export const SCHOOL_HOLIDAY_PERIODS = {
  2024: [
    // March/April holidays
    { start: '2024-03-25', end: '2024-04-10', name: 'Autumn Holiday' },
    // June/July holidays (Winter)
    { start: '2024-06-24', end: '2024-07-15', name: 'Winter Holiday' },
    // September holidays (Spring)
    { start: '2024-09-23', end: '2024-10-08', name: 'Spring Holiday' },
    // December holidays (Summer)
    { start: '2024-12-06', end: '2025-01-17', name: 'Summer Holiday' }
  ],
  2025: [
    // Continuation of December 2024 holidays
    { start: '2024-12-06', end: '2025-01-17', name: 'Summer Holiday' },
    // March/April holidays
    { start: '2025-03-24', end: '2025-04-08', name: 'Autumn Holiday' },
    // June/July holidays (Winter)
    { start: '2025-06-23', end: '2025-07-14', name: 'Winter Holiday' },
    // September holidays (Spring)
    { start: '2025-09-22', end: '2025-10-07', name: 'Spring Holiday' },
    // December holidays (Summer)
    { start: '2025-12-05', end: '2026-01-16', name: 'Summer Holiday' }
  ]
};

// South African Public Holidays that affect school schedules
export const PUBLIC_HOLIDAYS = {
  2024: [
    '2024-01-01', // New Year's Day
    '2024-03-21', // Human Rights Day
    '2024-03-29', // Good Friday
    '2024-04-01', // Easter Monday
    '2024-04-27', // Freedom Day
    '2024-05-01', // Workers' Day
    '2024-06-16', // Youth Day
    '2024-08-09', // National Women's Day
    '2024-09-24', // Heritage Day
    '2024-12-16', // Day of Reconciliation
    '2024-12-25', // Christmas Day
    '2024-12-26'  // Day of Goodwill
  ],
  2025: [
    '2025-01-01', // New Year's Day
    '2025-03-21', // Human Rights Day
    '2025-04-18', // Good Friday
    '2025-04-21', // Easter Monday
    '2025-04-27', // Freedom Day
    '2025-05-01', // Workers' Day
    '2025-06-16', // Youth Day
    '2025-08-09', // National Women's Day
    '2025-09-24', // Heritage Day
    '2025-12-16', // Day of Reconciliation
    '2025-12-25', // Christmas Day
    '2025-12-26'  // Day of Goodwill
  ]
};

/**
 * Check if a given date falls within South African school holidays
 */
export function isSchoolHolidayPeriod(date: Date = new Date()): boolean {
  // Development bypass
  if (DEV_MODE) {
    console.log('🏫 Development mode: Bypassing school holiday check');
    return true;
  }

  const year = date.getFullYear();
  const dateStr = format(date, 'yyyy-MM-dd');

  // Check if it's a public holiday
  const publicHolidays = PUBLIC_HOLIDAYS[year as keyof typeof PUBLIC_HOLIDAYS] || [];
  if (publicHolidays.includes(dateStr)) {
    return true;
  }

  // Check if it's within school holiday periods
  const holidayPeriods = SCHOOL_HOLIDAY_PERIODS[year as keyof typeof SCHOOL_HOLIDAY_PERIODS] || [];
  
  return holidayPeriods.some(period => {
    try {
      return isWithinInterval(date, {
        start: parseISO(period.start),
        end: parseISO(period.end)
      });
    } catch (error) {
      console.error('Error checking school holiday period:', error);
      return false;
    }
  });
}

/**
 * Get the current school holiday period if we're in one
 */
export function getCurrentSchoolHolidayPeriod(date: Date = new Date()) {
  // Development bypass
  if (DEV_MODE) {
    return {
      name: 'Winter Holiday Period',
      start: format(date, 'yyyy-MM-dd'),
      end: format(date, 'yyyy-MM-dd'),
      isDev: true
    };
  }

  const year = date.getFullYear();
  const holidayPeriods = SCHOOL_HOLIDAY_PERIODS[year as keyof typeof SCHOOL_HOLIDAY_PERIODS] || [];

  return holidayPeriods.find(period => {
    try {
      return isWithinInterval(date, {
        start: parseISO(period.start),
        end: parseISO(period.end)
      });
    } catch (error) {
      console.error('Error finding current school holiday period:', error);
      return false;
    }
  });
}

/**
 * Get the next upcoming school holiday period
 */
export function getNextSchoolHolidayPeriod(date: Date = new Date()) {
  const year = date.getFullYear();
  const nextYear = year + 1;
  
  // Combine current and next year periods
  const currentYearPeriods = SCHOOL_HOLIDAY_PERIODS[year as keyof typeof SCHOOL_HOLIDAY_PERIODS] || [];
  const nextYearPeriods = SCHOOL_HOLIDAY_PERIODS[nextYear as keyof typeof SCHOOL_HOLIDAY_PERIODS] || [];
  const allPeriods = [...currentYearPeriods, ...nextYearPeriods];

  return allPeriods.find(period => {
    try {
      const periodStart = parseISO(period.start);
      return periodStart > date;
    } catch (error) {
      console.error('Error finding next school holiday period:', error);
      return false;
    }
  });
}

/**
 * Check if school holiday support should be available
 */
export function isSchoolHolidaySupportAvailable(): {
  available: boolean;
  reason?: string;
  currentPeriod?: any;
  nextPeriod?: any;
} {
  const now = new Date();
  
  if (isSchoolHolidayPeriod(now)) {
    return {
      available: true,
      currentPeriod: getCurrentSchoolHolidayPeriod(now)
    };
  }

  const nextPeriod = getNextSchoolHolidayPeriod(now);
  
  return {
    available: false,
    reason: 'School holiday support is only available during official South African school holidays and public holidays.',
    nextPeriod
  };
}