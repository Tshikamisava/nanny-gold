/**
 * Centralized Service Pricing Configuration
 * Single source of truth for all service pricing across the application
 */

export interface ServicePriceConfig {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const SERVICE_PRICING = {
  // Short Term Services (Hourly/Daily)
  short_term: {
    emergency: {
      hourly_rate: 80,
      min_hours: 5,
      service_fee: 35
    },
    date_night: {
      hourly_rate: 120,
      min_hours: 3,
      service_fee: 35
    },
    day_care: {
      standard_hourly: 40,
      weekend_hourly: 55, // Fri/Sat/Sun
      service_fee: 35
    },
    gap_coverage: {
      weekday_rate: 280,
      weekend_rate: 350,
      min_days: 5,
      placement_fee: 2500 // Replaces service fee
    }
  },

  // Long Term Services (Monthly)
  long_term: {
    placement_fee: {
      standard: 2500,
      premium_percentage: 0.50 // 50% of monthly rate
    },
    base_rates: {
      pocket_palace: { live_in: 4500, live_out: 4800 },
      family_hub: { live_in: 6000, live_out: 6800 },
      grand_estate: { live_in: 7000, live_out: 7800 },
      monumental_manor: { live_in: 8000, live_out: 9000 },
      epic_estates: { live_in: 10000, live_out: 11000 }
    }
  },

  // Add-ons
  add_ons: {
    cooking: {
      short_term_daily: 100,
      long_term_monthly: 1500
    },
    driving: {
      long_term_monthly: 1500
    },
    diverse_ability: {
      short_term_hourly: 0,
      long_term_monthly: 1500
    },
    child_surcharge: {
      threshold: 3,
      amount: 500
    },
    adult_occupant_surcharge: {
      threshold: 2,
      amount: 500
    },
    light_housekeeping: {
      pocket_palace: 80,
      family_hub: 100,
      grand_estate: 120,
      monumental_manor: 140,
      epic_estates: 300
    }
  }
} as const;

/**
 * Get service pricing by ID
 */
export const getServicePrice = (serviceId: string): number => {
  return SERVICE_PRICING[serviceId]?.price || 0;
};

/**
 * Get all services as array for modification dialogs
 */
export const getServiceOptions = () => {
  return Object.values(SERVICE_PRICING).map(service => ({
    id: service.id,
    name: service.name,
    monthlyRate: service.price,
    description: service.description
  }));
};
