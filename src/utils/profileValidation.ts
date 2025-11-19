// Client profile validation utilities
import { ClientProfileData } from '@/services/clientProfileService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateClientProfile = (profileData: ClientProfileData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Only validate FORMAT of data that IS provided - don't block on missing fields
  
  // Validate children ages FORMAT (not presence)
  if (profileData.childrenAges && profileData.childrenAges.length > 0) {
    const validAges = profileData.childrenAges.filter(age => age && age.trim());
    
    // Check for invalid age formats
    validAges.forEach((age) => {
      if (age && !isValidAgeFormat(age)) {
        warnings.push(`Age "${age}" format may be incorrect (use "3 years" or "18 months")`);
      }
    });
  }

  // Validate other dependents VALUE (not presence)
  if (profileData.otherDependents !== undefined && profileData.otherDependents < 0) {
    errors.push('Number of other dependents cannot be negative');
  }
  
  if (profileData.otherDependents && profileData.otherDependents > 20) {
    warnings.push('Large number of dependents - please verify this is correct');
  }

  // Informational warnings only - don't block saves
  if (!profileData.firstName?.trim()) {
    warnings.push('Adding your first name will help personalize your experience');
  }
  
  if (!profileData.lastName?.trim()) {
    warnings.push('Adding your last name will help us communicate with you');
  }
  
  if (!profileData.phone?.trim()) {
    warnings.push('Phone number is needed for booking confirmations');
  }
  
  if (!profileData.homeSize) {
    warnings.push('Home size helps us match you with the right nanny');
  }

  // Validate address format if partially provided
  const addressFields = [
    profileData.streetAddress,
    profileData.city,
    profileData.province
  ].filter(field => field?.trim());
  
  if (addressFields.length > 0 && addressFields.length < 3) {
    warnings.push('Complete your address for better service');
  }

  return {
    isValid: errors.length === 0, // Only FORMAT errors block saves
    errors,
    warnings
  };
};

export const isValidAgeFormat = (age: string): boolean => {
  if (!age?.trim()) return false;
  
  // Allow formats like: "3 years", "18 months", "2.5 years", "6", etc.
  const agePattern = /^(\d+(?:\.\d+)?)\s*(years?|months?|yrs?|mos?)?$|^\d+$/i;
  return agePattern.test(age.trim());
};

export const sanitizeChildrenAges = (ages: string[]): string[] => {
  return ages
    .map(age => age?.toString().trim())
    .filter(age => age && age !== '');
};

export const validateOtherDependents = (value: any): number => {
  const numericValue = parseInt(String(value)) || 0;
  return Math.max(0, Math.min(20, numericValue)); // Clamp between 0 and 20
};

export const formatChildAge = (age: string): string => {
  if (!age?.trim()) return '';
  
  const trimmedAge = age.trim();
  
  // If it's just a number, add "years"
  if (/^\d+$/.test(trimmedAge)) {
    const num = parseInt(trimmedAge);
    return num === 1 ? `${num} year` : `${num} years`;
  }
  
  // If it's a decimal, add "years" 
  if (/^\d+\.\d+$/.test(trimmedAge)) {
    return `${trimmedAge} years`;
  }
  
  return trimmedAge;
};