import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a single random 6-character alphanumeric referral code
 */
export const generateUniqueCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Generate multiple unique referral codes
 * Ensures no duplicates within the generated set
 */
export const generateBulkCodes = (count: number): string[] => {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateUniqueCode());
  }
  return Array.from(codes);
};

/**
 * Check if a referral code already exists in the database
 */
export const checkCodeExists = async (code: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('referral_participants')
    .select('referral_code')
    .eq('referral_code', code.toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking code existence:', error);
    return false;
  }

  return !!data;
};

/**
 * Generate codes and verify they don't exist in database
 * Returns unique codes not already in the database
 */
export const generateVerifiedUniqueCodes = async (count: number): Promise<string[]> => {
  const verifiedCodes: string[] = [];
  const maxAttempts = count * 3; // Allow up to 3x attempts to avoid infinite loops
  let attempts = 0;

  while (verifiedCodes.length < count && attempts < maxAttempts) {
    const code = generateUniqueCode();
    attempts++;

    // Check if code already exists in database
    const exists = await checkCodeExists(code);
    
    if (!exists && !verifiedCodes.includes(code)) {
      verifiedCodes.push(code);
    }
  }

  if (verifiedCodes.length < count) {
    console.warn(`Only generated ${verifiedCodes.length} out of ${count} requested codes`);
  }

  return verifiedCodes;
};
