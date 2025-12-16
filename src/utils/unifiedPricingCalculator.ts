/**
 * ✅ P6: PRICING PREVIEW ONLY - NOT SOURCE OF TRUTH
 * 
 * This calculator is for PREVIEW/ESTIMATES ONLY to show users pricing before booking.
 * The database function calculate_booking_revenue() is the SINGLE SOURCE OF TRUTH
 * for all financial calculations. Once a booking is created, all revenue calculations
 * are done server-side and stored in booking_financials table.
 * 
 * DO NOT use this for actual billing, invoicing, or financial reporting.
 * 
 * Unified Pricing Calculator
 * Single source of truth for FRONTEND PREVIEW pricing calculations across all booking flows
 */

import { longTermServiceHandler } from './longTermServiceHandler';
import { shortTermServiceHandler } from './shortTermServiceHandler';
import { PricingContext } from './serviceInterface';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedPricingResult {
  total: number;
  breakdown: {
    baseRate: number;
    serviceFees: Array<{ name: string; amount: number }>;
    placementFee?: number;
    serviceFee?: number;
  };
  label: string;
  durationType: 'long_term' | 'short_term';
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export class UnifiedPricingCalculator {
  
  /**
   * Calculate pricing for any booking type
   */
  async calculatePricing(preferences: any): Promise<UnifiedPricingResult> {
    if (!preferences || typeof preferences !== 'object') {
      return {
        total: 0,
        breakdown: { baseRate: 0, serviceFees: [] },
        label: '/total',
        durationType: 'short_term',
        isValid: false,
        errors: ['Invalid preferences provided']
      };
    }
    const durationType = preferences.durationType || 'short_term';
    const context: PricingContext = {
      durationType,
      bookingType: preferences.bookingSubType,
      homeSize: preferences.homeSize,
      livingArrangement: preferences.livingArrangement,
      childrenAges: preferences.childrenAges,
      otherDependents: preferences.otherDependents,
      selectedDates: preferences.selectedDates,
      timeSlots: preferences.timeSlots
    };
    
    if (durationType === 'long_term') {
      return this.calculateLongTermPricing(preferences, context);
    } else {
      return this.calculateShortTermPricing(preferences, context);
    }
  }
  
  /**
   * Calculate long-term pricing (monthly + placement fee)
   */
  private calculateLongTermPricing(preferences: any, context: PricingContext): UnifiedPricingResult {
    try {
    const handler = longTermServiceHandler;
    const services = handler.mapServices(preferences);
    const validation = handler.validatePricingParams(services, context);
    
    if (!validation.isValid) {
      return {
        total: 0,
        breakdown: { baseRate: 0, serviceFees: [] },
        label: '/month',
        durationType: 'long_term',
        isValid: false,
        errors: validation.missingParams,
        warnings: validation.warnings
      };
    }
    
    const pricing = handler.getServicePricing(services, context);
    
    // Calculate placement fee (CORRECTED - 50% of BASE rate only, or flat R2,500)
    const placementFee = this.calculatePlacementFee(context.homeSize || 'family_hub', pricing.baseRate);
    
    return {
      total: placementFee, // For initial payment display
      breakdown: {
        baseRate: pricing.baseRate,
        serviceFees: pricing.serviceFees,
        placementFee
      },
      label: 'placement fee',
      durationType: 'long_term',
      isValid: true,
      warnings: validation.warnings
    };
    } catch (error) {
      console.error('Long-term pricing calculation error:', error);
      return {
        total: 0,
        breakdown: { baseRate: 0, serviceFees: [] },
        label: '/month',
        durationType: 'long_term',
        isValid: false,
        errors: ['Failed to calculate long-term pricing']
      };
    }
  }
  
  /**
   * Calculate short-term pricing (hourly/daily)
   */
  private async calculateShortTermPricing(preferences: any, context: PricingContext): Promise<UnifiedPricingResult> {
    const handler = shortTermServiceHandler;
    const services = handler.mapServices(preferences);
    const validation = handler.validatePricingParams(services, context);
    
    if (!validation.isValid) {
      return {
        total: 0,
        breakdown: { baseRate: 0, serviceFees: [] },
        label: '/total',
        durationType: 'short_term',
        isValid: false,
        errors: validation.missingParams,
        warnings: validation.warnings
      };
    }
    
    // Calculate total hours from time slots and dates
    const totalHours = this.calculateTotalHours(preferences);
    
    try {
      // Call edge function for accurate short-term pricing
      const { data: pricing, error } = await supabase.functions.invoke('calculate-hourly-pricing', {
        body: {
          bookingType: context.bookingType,
          totalHours,
          services: {
            cooking: services.cooking,
            specialNeeds: services.specialNeeds,
            drivingSupport: services.drivingSupport,
            lightHousekeeping: services.lightHousekeeping
          },
          selectedDates: context.selectedDates,
          homeSize: services.lightHousekeeping ? context.homeSize : undefined
        }
      });
      
      if (error) throw error;
      
      return {
        total: pricing.total,
        breakdown: {
          baseRate: pricing.baseHourlyRate * totalHours,
          serviceFees: pricing.services || [],
          serviceFee: 35
        },
        label: '/total',
        durationType: 'short_term',
        isValid: true,
        warnings: validation.warnings
      };
      
    } catch (error) {
      console.error('Short-term pricing calculation error:', error);
      
      // Fallback calculation
      const servicePricing = handler.getServicePricing(services, context);
      const total = (servicePricing.total * totalHours) + 35; // Add R35 service fee
      
      return {
        total,
        breakdown: {
          baseRate: servicePricing.baseRate * totalHours,
          serviceFees: servicePricing.serviceFees,
          serviceFee: 35
        },
        label: '/total',
        durationType: 'short_term',
        isValid: true,
        warnings: [...(validation.warnings || []), 'Using fallback calculation']
      };
    }
  }
  
  /**
   * Calculate total hours from time slots and dates
   */
  private calculateTotalHours(preferences: any): number {
    try {
      if (!preferences?.timeSlots || !preferences?.selectedDates) {
        return 8; // Default fallback
      }
      
      const dailyHours = preferences.timeSlots.reduce((total: number, slot: any) => {
        if (!slot?.start || !slot?.end) return total;
        
        const start = new Date(`2000-01-01T${slot.start}:00`);
        const end = new Date(`2000-01-01T${slot.end}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + (isNaN(hours) ? 0 : hours);
      }, 0);
      
      return dailyHours * preferences.selectedDates.length;
    } catch (error) {
      console.error('Error calculating total hours:', error);
      return 8; // Safe fallback
    }
  }
  
  /**
   * Calculate placement fee (added for Phase 1 fix)
   */
  private calculatePlacementFee(homeSize: string | undefined, baseRate: number): number {
    if (!homeSize || typeof homeSize !== 'string') {
      return 2500; // Default fallback
    }
    
    const mappedSize = homeSize.toLowerCase().replace(/[- ]/g, '_');
    
    // Flat R2,500 for standard homes (Pocket Palace, Family Hub)
    if (['pocket_palace', 'family_hub'].includes(mappedSize)) {
      return 2500;
    }
    
    // 50% for premium estates (Grand Estate, Monumental Manor, Epic Estates)
    if (['grand_estate', 'monumental_manor', 'epic_estates'].includes(mappedSize)) {
      return Math.round(baseRate * 0.5);
    }
    
    return 2500; // Default fallback
  }
}

// Export singleton instance
export const unifiedPricingCalculator = new UnifiedPricingCalculator();
