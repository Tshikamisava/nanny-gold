// Data consistency utilities to prevent live-in/live-out errors

export const validateLivingArrangementPricing = (
  homeSize: string, 
  livingArrangement: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!homeSize) {
    errors.push('Home size is required for pricing calculation');
  }
  
  if (!livingArrangement) {
    errors.push('Living arrangement (live-in/live-out) is required');
  }
  
  const validHomeSizes = ['small', 'medium', 'large', 'monumental'];
  if (homeSize && !validHomeSizes.includes(homeSize.toLowerCase())) {
    errors.push(`Invalid home size: ${homeSize}. Must be one of: ${validHomeSizes.join(', ')}`);
  }
  
  const validArrangements = ['live-in', 'live-out'];
  if (livingArrangement && !validArrangements.includes(livingArrangement)) {
    errors.push(`Invalid living arrangement: ${livingArrangement}. Must be one of: ${validArrangements.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const mapDatabaseToPreferences = (clientData: any, profileData: any) => {
  return {
    // Map database column names to preference names
    homeSize: clientData?.home_size || '',
    childrenAges: clientData?.children_ages || [],
    otherDependents: clientData?.other_dependents || 0,
    petsInHome: clientData?.pets_in_home || '',
    location: profileData?.location || '',
    numberOfChildren: clientData?.number_of_children || 0,
    additionalRequirements: clientData?.additional_requirements || ''
  };
};

export const validatePricingConsistency = (preferences: any) => {
  const errors: string[] = [];
  
  // Check for critical data mismatches
  if (preferences.durationType === 'long_term') {
    if (!preferences.homeSize) {
      errors.push('Home size required for long-term bookings');
    }
    if (!preferences.livingArrangement) {
      errors.push('Living arrangement required for long-term bookings');
    }
  }
  
  if (preferences.childrenAges && preferences.childrenAges.length > 0) {
    if (!preferences.numberOfChildren || preferences.numberOfChildren !== preferences.childrenAges.length) {
      errors.push('Number of children does not match children ages array');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};