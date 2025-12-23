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
    // Updated base monthly rates by home size and living arrangement
    const BASE_RATES: Record<string, { live_in: number; live_out: number }> = {
      'pocket_palace': { live_in: 4500, live_out: 4800 },
      'family_hub': { live_in: 6000, live_out: 6800 },
      'grand_estate': { live_in: 7000, live_out: 7800 },
      'monumental_manor': { live_in: 8000, live_out: 9000 },
      'epic_estates': { live_in: 10000, live_out: 11000 }
    };
    
    const homeSize = context.homeSize || 'family_hub';
    const livingArrangement = context.livingArrangement?.replace(/-/g, '_').toLowerCase() || 'live_out';
    const homeSizeRates = BASE_RATES[homeSize] || BASE_RATES['family_hub'];
    let baseRate = livingArrangement === 'live_in' ? homeSizeRates.live_in : homeSizeRates.live_out;
    
    const serviceFees: Array<{ name: string; amount: number }> = [];
    
    // Count children for extra child fees (R500 each after 3rd child)
    const numChildren = context.childrenAges ? context.childrenAges.filter(age => {
      const numericAge = parseFloat(age.match(/\d+(\.\d+)?/)?.[0] || '0');
      return numericAge <= 18;
    }).length : 0;
    
    if (numChildren > 3) {
      const extraChildren = numChildren - 3;
      serviceFees.push({ name: `Extra Children (${extraChildren})`, amount: extraChildren * 500 });
      baseRate += extraChildren * 500;
    }
    
    // Extra adult dependents (R500 each after 2nd)
    if (context.otherDependents && context.otherDependents > 2) {
      const extraAdults = context.otherDependents - 2;
      serviceFees.push({ name: `Extra Adult Dependents (${extraAdults})`, amount: extraAdults * 500 });
      baseRate += extraAdults * 500;
    }
    
    // Light housekeeping is INCLUDED in monthly rate (no extra fee)
    if (services.lightHousekeeping) {
      serviceFees.push({ name: 'Light Housekeeping', amount: 0 });
    }
    
    // Add-on services
    if (services.cooking) {
      serviceFees.push({ name: 'Cooking/Food Prep', amount: 1500 });
    }
    
    if (services.specialNeeds) {
      serviceFees.push({ name: 'Diverse Ability Support', amount: 1500 });
    }
    
    if (services.drivingSupport) {
      serviceFees.push({ name: 'Driving Support', amount: 1500 });
    }
    
    if (services.ecdTraining) {
      serviceFees.push({ name: 'ECD Training', amount: 500 });
    }
    
    if (services.montessori) {
      serviceFees.push({ name: 'Montessori Training', amount: 450 });
    }
    
    if (services.backupNanny) {
      serviceFees.push({ name: 'Backup Nanny Service', amount: 100 });
    }
    
    const total = baseRate + serviceFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return { baseRate, serviceFees, total };
  }
}

// Export singleton instance
export const longTermServiceHandler = new LongTermServiceHandler();
