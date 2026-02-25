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
      min_days: 10,
      // Normal days pricing
      normal: {
        placement_fee: {
          short: 750,    // 10 days
          medium: 1200,  // 11-20 days
          extended: 1800 // 21-30 days
        },
        service_fee_per_day: {
          short: 370     // 10 days (fixed daily rate)
          // 11-30 days: Pro-rata (Monthly base + Add-ons) / 31
        },
      },
      // Busy months (Dec/Jan, June/July)
      busy_months: {
        placement_fee: {
          short: 1500,   // 10 days
          medium: 2000, // 11-20 days
          extended: 2500 // 21-30 days
        },
        service_fee_per_day: {
          short: 420     // 10 days (fixed daily rate)
          // 11-30 days: Pro-rata (Monthly base + Add-ons) / 31 + 30% surcharge
        },
        surcharge_percentage: 0.30 // 30% surcharge for 11-30 days
      },
      // Promotional/Introductory 2026
      promotional: {
        // Uses normal pricing but with different payment terms
        // Placement Fee: Payable over 2 months
        // Service Fee: 50% in monthly payments before booking, balance on last day
        payment_terms: {
          placement_fee_installments: 2, // Over 2 months
          service_fee_upfront_percentage: 0.50 // 50% before booking starts
        }
      },
      // International families
      international: {
        placement_fee: 5000, // Flat R5,000 regardless of days
        service_fee_per_day: {
          short: 840     // 10 days (fixed daily rate)
          // 11-30 days: Pro-rata (Monthly base + Add-ons) / 31 + 10% surcharge
        },
        surcharge_percentage: 0.10 // 10% surcharge for 11-30 days
      },
      // South African families - replacement nanny
      sa_replacement: {
        placement_fee: 2500, // Flat R2,500 regardless of days
        service_fee_per_day: {
          short: 420     // 10 days (fixed daily rate)
          // 11-30 days: Pro-rata (Monthly base + Add-ons) / 31 + 10% surcharge
        },
        surcharge_percentage: 0.10 // 10% surcharge for 11-30 days
      },
      // South African families - going away within SA
      sa_going_away: {
        placement_fee: 3500, // Flat R3,500 regardless of days
        service_fee_per_day: {
          short: 420     // 10 days (fixed daily rate)
          // 11-30 days: Pro-rata (Monthly base + Add-ons) / 31 + 10% surcharge
        },
        surcharge_percentage: 0.10 // 10% surcharge for 11-30 days
      }
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
