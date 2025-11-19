/**
 * Short-Term Service Handler
 * Handles boolean service flags and hourly/daily rate calculations
 */

import { ServiceMapping, PricingContext, ServiceHandler } from './serviceInterface';

export class ShortTermServiceHandler implements ServiceHandler {
  
  /**
   * Maps short-term preferences (booleans) to service flags
   */
  mapServices(preferences: any): ServiceMapping {
    const householdSupport = preferences.householdSupport || [];
    
    return {
      cooking: preferences.cooking || false,
      specialNeeds: preferences.specialNeeds || false,
      drivingSupport: preferences.drivingSupport || false,
      // For short-term, light housekeeping is converted from array to boolean
      lightHousekeeping: householdSupport.includes('light-housekeeping'),
      errandRuns: householdSupport.includes('errand-runs')
    };
  }
  
  /**
   * Validates required parameters for short-term pricing
   */
  validatePricingParams(services: ServiceMapping, context: PricingContext) {
    const missing: string[] = [];
    const warnings: string[] = [];
    
    // Booking type required
    if (!context.bookingType) {
      missing.push('bookingType');
    }
    
    // Home size ONLY required if light housekeeping is selected
    if (services.lightHousekeeping && !context.homeSize) {
      missing.push('homeSize (required for light housekeeping)');
    }
    
    // Selected dates required for pricing
    if (!context.selectedDates || context.selectedDates.length === 0) {
      warnings.push('No dates selected - using default calculation');
    }
    
    return {
      isValid: missing.length === 0,
      missingParams: missing.length > 0 ? missing : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Gets short-term service pricing (hourly/daily rates)
   */
  getServicePricing(services: ServiceMapping, context: PricingContext) {
    const bookingType = context.bookingType || 'date_night';
    
    // Base hourly rates by booking type
    const baseRates: Record<string, number> = {
      'emergency': 80,
      'date_night': 40,
      'date_day': 40,
      'school_holiday': 40,
      'temporary_support': 40
    };
    
    const baseRate = baseRates[bookingType] || 40;
    const serviceFees: Array<{ name: string; amount: number }> = [];
    
    // Service fees - Cooking is R100/day for ALL short-term services
    if (services.cooking) {
      serviceFees.push({ name: 'Cooking (daily)', amount: 100 });
    }
    
    if (services.specialNeeds) {
      serviceFees.push({ name: 'Diverse Ability Support', amount: 25 });
    }
    
    if (services.drivingSupport) {
      serviceFees.push({ name: 'Driving Support', amount: 10 });
    }
    
    // Light housekeeping is DAILY rate (not hourly) based on home size
    if (services.lightHousekeeping && context.homeSize) {
      const housekeepingRates: Record<string, number> = {
        'pocket_palace': 80,
        'family_hub': 100,
        'grand_retreat': 120,
        'epic_estates': 300
      };
      
      const dailyRate = housekeepingRates[context.homeSize] || 150;
      serviceFees.push({ name: 'Light Housekeeping (daily)', amount: dailyRate });
    }
    
    const total = baseRate + serviceFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return { baseRate, serviceFees, total };
  }
}

// Export singleton instance
export const shortTermServiceHandler = new ShortTermServiceHandler();
