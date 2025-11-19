/**
 * Long-Term Service Handler
 * Handles householdSupport arrays and monthly rate calculations
 */

import { ServiceMapping, PricingContext, ServiceHandler } from './serviceInterface';

export class LongTermServiceHandler implements ServiceHandler {
  
  /**
   * Maps long-term preferences (arrays) to service flags
   */
  mapServices(preferences: any): ServiceMapping {
    const householdSupport = preferences.householdSupport || [];
    
    return {
      cooking: preferences.cooking || false,
      specialNeeds: preferences.specialNeeds || false,
      drivingSupport: preferences.drivingSupport || false,
      petCare: preferences.petCare || false,
      ecdTraining: preferences.ecdTraining || false,
      montessori: preferences.montessori || false,
      backupNanny: preferences.backupNanny || false,
      // Light housekeeping is INCLUDED in monthly rate for long-term
      lightHousekeeping: householdSupport.includes('light-housekeeping'),
      errandRuns: householdSupport.includes('errand-runs')
    };
  }
  
  /**
   * Validates required parameters for long-term pricing
   */
  validatePricingParams(services: ServiceMapping, context: PricingContext) {
    const missing: string[] = [];
    const warnings: string[] = [];
    
    // Home size required for placement fee calculation
    if (!context.homeSize) {
      missing.push('homeSize');
    }
    
    // Living arrangement required for monthly rate
    if (!context.livingArrangement) {
      missing.push('livingArrangement');
    }
    
    // Warn if light housekeeping but no home size
    if (services.lightHousekeeping && !context.homeSize) {
      warnings.push('Light housekeeping selected but home size not provided');
    }
    
    return {
      isValid: missing.length === 0,
      missingParams: missing.length > 0 ? missing : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Gets long-term service pricing (monthly rates)
   */
  getServicePricing(services: ServiceMapping, context: PricingContext) {
    // Base monthly rates by home size and living arrangement (CORRECTED)
    const BASE_RATES: Record<string, { live_in: number; live_out: number }> = {
      'pocket_palace': { live_in: 4000, live_out: 4800 },
      'family_hub': { live_in: 6000, live_out: 6800 },
      'grand_retreat': { live_in: 7000, live_out: 7800 },
      'epic_estates': { live_in: 10000, live_out: 11000 }
    };
    
    const homeSize = context.homeSize || 'family_hub';
    const livingArrangement = context.livingArrangement?.replace(/-/g, '_').toLowerCase() || 'live_out';
    const homeSizeRates = BASE_RATES[homeSize] || BASE_RATES['family_hub'];
    const baseRate = livingArrangement === 'live_in' ? homeSizeRates.live_in : homeSizeRates.live_out;
    
    const serviceFees: Array<{ name: string; amount: number }> = [];
    
    // Light housekeeping is INCLUDED in monthly rate (no extra fee)
    if (services.lightHousekeeping) {
      serviceFees.push({ name: 'Light Housekeeping', amount: 0 });
    }
    
    // Other services may have add-on costs
    if (services.ecdTraining) {
      serviceFees.push({ name: 'ECD Training', amount: 500 });
    }
    
    if (services.montessori) {
      serviceFees.push({ name: 'Montessori', amount: 800 });
    }
    
    if (services.backupNanny) {
      serviceFees.push({ name: 'Backup Nanny', amount: 1000 });
    }
    
    const total = baseRate + serviceFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return { baseRate, serviceFees, total };
  }
}

// Export singleton instance
export const longTermServiceHandler = new LongTermServiceHandler();
