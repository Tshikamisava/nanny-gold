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

export const SERVICE_PRICING: Record<string, ServicePriceConfig> = {
  cooking: {
    id: 'cooking',
    name: 'Cooking/Food Prep',
    price: 1500, // R1,500/month
    description: 'Meal preparation and cooking'
  },
  backup_nanny: {
    id: 'backup_nanny',
    name: 'Backup Nanny Service',
    price: 100, // R100/month
    description: 'Emergency replacement service'
  },
  driving_support: {
    id: 'driving_support',
    name: 'Driving Support',
    price: 1800, // R1,800/month
    description: 'Transportation assistance'
  },
  special_needs: {
    id: 'special_needs',
    name: 'Diverse Ability Support',
    price: 2000, // R2,000/month
    description: 'Specialized care for children or other dependants with diverse abilities'
  },
  ecd_training: {
    id: 'ecd_training',
    name: 'ECD Training',
    price: 500, // R500/month
    description: 'Early childhood development training'
  },
  montessori: {
    id: 'montessori',
    name: 'Montessori Training',
    price: 450, // R450/month
    description: 'Montessori methodology training'
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
