/**
 * Utility functions to map database home size values to user-friendly display names
 */

export type HomeSizeValue = 
  | 'pocket_palace' 
  | 'family_hub' 
  | 'grand_estate' 
  | 'monumental_manor'
  | 'epic_estates'
  | string; // fallback for any unexpected values

/**
 * Get the display name for a home size
 */
export const getHomeSizeDisplayName = (homeSizeValue: HomeSizeValue | null | undefined): string => {
  if (!homeSizeValue) return 'Family Hub';
  
  const mapping: Record<string, string> = {
    'pocket_palace': 'Pocket Palace',
    'family_hub': 'Family Hub',
    'grand_estate': 'Grand Estate',
    'monumental_manor': 'Monumental Manor',
    'epic_estates': 'Epic Estates',
  };
  
  return mapping[homeSizeValue.toLowerCase()] || 'Family Hub';
};

/**
 * Get the full description for a home size (includes size range)
 */
export const getHomeSizeFullDescription = (homeSizeValue: HomeSizeValue | null | undefined): string => {
  if (!homeSizeValue) return 'Family Hub (120-200m² - Comfortable 3 bedrooms)';
  
  const mapping: Record<string, string> = {
    'pocket_palace': 'Pocket Palace (<120m² - Cosy 2 bedrooms)',
    'family_hub': 'Family Hub (120-200m² - Comfortable 3 bedrooms)',
    'grand_estate': 'Grand Estate (200-350m² - Spacious 4 bedrooms)',
    'monumental_manor': 'Monumental Manor (301-360m² - Luxurious 5+ oversized bedrooms)',
    'epic_estates': 'Epic Estates (361m²+ - Grand luxury living with oversized rooms, elegant spaces, and elite amenities)',
  };
  
  return mapping[homeSizeValue.toLowerCase()] || 'Family Hub (120-200m² - Comfortable 3 bedrooms)';
};
