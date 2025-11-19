/**
 * Format location data that may be stored as JSON or formatted string
 */
export function formatLocation(location: string | null | undefined): string {
  if (!location) {
    return 'Not specified';
  }

  // Check if it's a JSON string
  if (location.startsWith('{') || location.startsWith('[')) {
    try {
      const parsed = JSON.parse(location);
      
      // Handle object format with properties
      if (typeof parsed === 'object' && parsed !== null) {
        const parts = [
          parsed.street,
          parsed.suburb,
          parsed.city,
          parsed.province,
          parsed.postalCode || parsed.postal_code
        ].filter(Boolean);
        
        return parts.length > 0 ? parts.join(', ') : 'Not specified';
      }
    } catch (error) {
      // If JSON parsing fails, treat as regular string
      console.warn('Failed to parse location JSON:', error);
    }
  }

  // Return as-is if it's already a formatted string
  return location.trim() || 'Not specified';
}
