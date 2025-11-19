/**
 * Unified Service Interface
 * Common patterns for both long-term and short-term service handling
 */

export interface ServiceMapping {
  cooking?: boolean;
  specialNeeds?: boolean;
  drivingSupport?: boolean;
  petCare?: boolean;
  ecdTraining?: boolean;
  montessori?: boolean;
  backupNanny?: boolean;
  lightHousekeeping?: boolean;
  errandRuns?: boolean;
}

export interface PricingContext {
  durationType: 'long_term' | 'short_term';
  bookingType?: string;
  homeSize?: string;
  livingArrangement?: string;
  childrenAges?: string[];
  otherDependents?: number;
  selectedDates?: string[];
  timeSlots?: Array<{ start: string; end: string }>;
}

export interface ServiceHandler {
  /**
   * Maps raw preferences to service flags
   */
  mapServices(preferences: any): ServiceMapping;
  
  /**
   * Validates required parameters for pricing
   */
  validatePricingParams(services: ServiceMapping, context: PricingContext): {
    isValid: boolean;
    missingParams?: string[];
    warnings?: string[];
  };
  
  /**
   * Gets service-specific pricing adjustments
   */
  getServicePricing(services: ServiceMapping, context: PricingContext): {
    baseRate: number;
    serviceFees: Array<{ name: string; amount: number }>;
    total: number;
  };
}
