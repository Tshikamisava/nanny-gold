/**
 * Utility functions for safely unwrapping values and preventing circular references
 */

/**
 * Safely unwraps a value that might be wrapped in an object with _type and value properties
 * This prevents circular references and ensures we get the actual value
 */
export const unwrapValue = (value: any): any => {
  // If value is null or undefined, return as-is
  if (value === null || value === undefined) {
    return value;
  }
  
  // If value is a primitive (string, number, boolean), return as-is
  if (typeof value !== 'object') {
    return value;
  }
  
  // If value has _type and value properties (wrapped value), unwrap it
  if (value && typeof value === 'object' && '_type' in value && 'value' in value) {
    return unwrapValue(value.value); // Recursively unwrap in case of nested wrapping
  }
  
  // If value is an array, unwrap each element
  if (Array.isArray(value)) {
    return value.map(unwrapValue);
  }
  
  // If value is a plain object, unwrap all properties
  if (value && typeof value === 'object' && value.constructor === Object) {
    const unwrapped: any = {};
    for (const [key, val] of Object.entries(value)) {
      unwrapped[key] = unwrapValue(val);
    }
    return unwrapped;
  }
  
  // For other object types (Date, etc.), return as-is
  return value;
};

/**
 * Safely extracts booking details from preferences object, unwrapping any wrapped values
 */
export const extractBookingDetails = (preferences: any) => {
  if (!preferences) {
    return {
      bookingSubType: undefined,
      durationType: undefined,
      selectedDates: undefined,
      timeSlots: undefined,
    };
  }
  
  return {
    bookingSubType: unwrapValue(preferences.bookingSubType),
    durationType: unwrapValue(preferences.durationType),
    selectedDates: unwrapValue(preferences.selectedDates),
    timeSlots: unwrapValue(preferences.timeSlots),
  };
};

/**
 * Safely cleans preferences object by unwrapping all wrapped values
 */
export const cleanPreferences = (preferences: any): any => {
  if (!preferences) {
    return null;
  }
  
  return unwrapValue(preferences);
};

/**
 * Type guard to check if a value is wrapped
 */
export const isWrappedValue = (value: any): boolean => {
  return value && typeof value === 'object' && '_type' in value && 'value' in value;
};