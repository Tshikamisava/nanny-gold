import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientProfileData {
  location: string;
  streetAddress?: string;
  estateInfo?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  numberOfChildren?: number;
  childrenAges: string[];
  otherDependents?: number;
  petsInHome?: string;
  homeSize?: string;
  specialNeeds: boolean;
  ecdTraining: boolean;
  drivingSupport: boolean;
  cooking: boolean;
  lightHouseKeeping?: boolean;
  errandRuns?: boolean;
  
  languages: string;
  montessori?: boolean;
  schedule?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  backupNanny?: boolean;
  livingArrangement?: string;
  durationType?: 'short_term' | 'long_term';
  bookingSubType?: 'date_night' | 'short_term' | 'school_holiday' | 'date_day' | 'emergency';
  selectedDates?: string[];
  timeSlots?: Array<{ start: string; end: string }>;
  additionalRequirements?: string;
}

// Helper function to get display name from database enum value
const getHomeSizeDisplayName = (value: string): string => {
  if (!value) return '';
  
  const mapping: { [key: string]: string } = {
    'pocket_palace': 'Pocket Palace (<120m² - Cosy 2 bedrooms)',
    'family_hub': 'Family Hub (120-200m² - Comfortable 3 bedrooms)',
    'grand_estate': 'Grand Estate (200-350m² - Spacious 4 bedrooms)',
    'monumental_manor': 'Monumental Manor (>350m² - Luxurious 5+ bedrooms)',
  };
  
  return mapping[value.toLowerCase()] || value;
};

// Validate South African phone number
const isValidSAPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+27[0-9]{9}|0[0-9]{9})$/.test(cleaned);
};

interface SaveProfileResult {
  success: boolean;
  error?: {
    message: string;
    userMessage: string;
    [key: string]: any;
  };
  savedData?: any;
}

export const saveClientProfile = async (
  userId: string,
  profileData: ClientProfileData
): Promise<SaveProfileResult> => {
  console.log('💾 saveClientProfile called for user:', userId);
  console.log('📦 Raw profile data received:', profileData);
  
  try {
    // Sanitize phone: remove all spaces before validation
    if (profileData.phone && profileData.phone.trim()) {
      profileData.phone = profileData.phone.replace(/\s+/g, '').trim();
    }

    // Validate phone format (South African)
    if (profileData.phone && !isValidSAPhone(profileData.phone)) {
      return {
        success: false,
        error: {
          message: 'Invalid phone number format',
          userMessage: 'Phone number must be 10 digits starting with 0 (e.g., 0831234567) with no spaces or special characters.',
          field: 'phone'
        }
      };
    }

    // Validate children ages if specified
    if (profileData.childrenAges && profileData.childrenAges.some(age => age.trim())) {
      const validAges = profileData.childrenAges.filter(age => age.trim());
      if (validAges.length === 0) {
        throw new Error('Please provide at least one child age');
      }
    }

    // Validate address completeness
    const hasAddress = profileData.streetAddress || profileData.city || profileData.province;
    if (hasAddress && (!profileData.city || !profileData.province)) {
      throw new Error('Address incomplete: City and Province are required');
    }

    // Clean and validate data
    const cleanedData = {
      ...profileData,
      childrenAges: profileData.childrenAges?.filter(age => age?.trim()) || [],
      otherDependents: Math.max(0, parseInt(String(profileData.otherDependents || 0)) || 0)
    };
    
    console.log('🧹 Cleaned profile data:', cleanedData);

    // Get auth session
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      throw new Error('Not authenticated');
    }

    console.log('🔐 Using direct database saves...');

    // Build address JSON object
    const addressJson = {
      street: cleanedData.streetAddress || '',
      estate: cleanedData.estateInfo || '',
      suburb: cleanedData.suburb || '',
      city: cleanedData.city || '',
      province: cleanedData.province || '',
      postal: cleanedData.postalCode || ''
    };

    // Check if address has any non-empty values
    const hasAddressData = Object.values(addressJson).some(val => val && val.trim() !== '');

    // Direct database saves without edge functions
    try {
      // 1. Update profiles table
      const profileUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      // Fetch current profile to compare phone number
      const { data: currentProfileData, error: fetchProfileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', userId)
        .single();

      if (fetchProfileError) {
        console.error('❌ Failed to fetch current profile:', fetchProfileError);
        throw new Error(`Failed to fetch current profile: ${fetchProfileError.message}`);
      }
      const currentPhone = currentProfileData?.phone;

      // Only update location if there's actual address data
      if (hasAddressData) {
        profileUpdates.location = JSON.stringify(addressJson);
        console.log('📍 Updating location with address data:', addressJson);
      }
      
      // Only include personal details if they have actual values
      if (cleanedData.firstName && cleanedData.firstName.trim() !== '') {
        profileUpdates.first_name = cleanedData.firstName;
      }
      if (cleanedData.lastName && cleanedData.lastName.trim() !== '') {
        profileUpdates.last_name = cleanedData.lastName;
      }
      if (cleanedData.phone && cleanedData.phone.trim() !== '') {
        // Sanitize phone: remove all spaces and special chars except leading +
        const sanitizedPhone = cleanedData.phone.replace(/\s+/g, '').trim();
        
        // Only update phone if it's different from the current one
        if (sanitizedPhone !== currentPhone) {
          // Validate format: must be +27XXXXXXXXX or 0XXXXXXXXX (10 digits total)
          if (/^(\+27|0)[0-9]{9}$/.test(sanitizedPhone)) {
            profileUpdates.phone = sanitizedPhone;
          } else {
            console.error('❌ Invalid phone format:', cleanedData.phone, '→', sanitizedPhone);
            throw new Error(`Invalid phone format: ${cleanedData.phone}. Must be 10 digits starting with 0 or +27.`);
          }
        } else {
          console.log('📞 Phone number is unchanged, skipping update.');
        }
      }
      
      console.log('📝 Profile updates being applied:', Object.keys(profileUpdates));
      
      const { error: profilesError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (profilesError) {
        console.error('❌ Profiles update failed:', profilesError);
        // Check for unique constraint violation specifically for phone number
        if (profilesError.code === '23505' && profilesError.message.includes('unique_phone')) {
          throw new Error('This phone number is already registered to another account. Please use a different one or contact support.');
        } else {
          throw new Error(`Profiles update failed: ${profilesError.message}`);
        }
      }
      console.log('✅ Profiles table updated');

      // 2. Update clients table
      const { error: clientsError } = await supabase
        .from('clients')
        .update({
          children_ages: cleanedData.childrenAges || [],
          other_dependents: cleanedData.otherDependents || 0,
          pets_in_home: cleanedData.petsInHome || null,
          home_size: cleanedData.homeSize || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (clientsError) {
        console.error('❌ Clients update failed:', clientsError);
        throw new Error(`Clients update failed: ${clientsError.message}`);
      }
      console.log('✅ Clients table updated');

      // 3. Update client_preferences table (upsert to handle first-time users)
      const preferencesData = {
        client_id: userId,
        special_needs: cleanedData.specialNeeds || false,
        ecd_training: cleanedData.ecdTraining || false,
        driving_support: cleanedData.drivingSupport || false,
        cooking: cleanedData.cooking || false,
        languages: cleanedData.languages || null,
        montessori: cleanedData.montessori || false,
        schedule: cleanedData.schedule || {},
        backup_nanny: cleanedData.backupNanny || false,
        updated_at: new Date().toISOString()
      };

      const { error: preferencesError } = await supabase
        .from('client_preferences')
        .upsert(preferencesData, { onConflict: 'client_id' });

      if (preferencesError) {
        console.error('❌ Preferences update failed:', preferencesError);
        throw new Error(`Preferences update failed: ${preferencesError.message}`);
      }
      console.log('✅ Preferences table updated');

      console.log('🎉 Profile saved successfully');
      
      // Cache the saved profile data
      cacheProfile(userId, cleanedData);
      
      return { 
        success: true,
        savedData: cleanedData
      };
      
    } catch (dbError: any) {
      console.error('❌ Database save failed:', dbError);
      throw new Error(dbError?.message || 'Failed to save profile to database');
    }
    
  } catch (error: any) {
    console.error('❌ saveClientProfile: Critical error occurred:', error);
    
    const errorMessage = error?.message || 'Unknown error occurred';
    
    return { 
      success: false, 
      error: {
        ...error,
        message: errorMessage,
        userMessage: errorMessage
      }
    };
  }
};

// Helper to get cached profile from localStorage
const getCachedProfile = (userId: string): ClientProfileData | null => {
  try {
    const cached = localStorage.getItem(`client-profile-${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is still valid (24 hours)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        console.log('📦 Using cached profile data from localStorage');
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('⚠️ Error reading cached profile:', e);
  }
  return null;
};

// Helper to save profile to localStorage
const cacheProfile = (userId: string, profileData: ClientProfileData | null) => {
  try {
    if (profileData) {
      localStorage.setItem(`client-profile-${userId}`, JSON.stringify({
        data: profileData,
        timestamp: Date.now()
      }));
      console.log('💾 Profile cached to localStorage');
    } else {
      // Don't cache null - keep existing cache if available
      console.log('⚠️ Not caching null profile, keeping existing cache if available');
    }
  } catch (e) {
    console.warn('⚠️ Error caching profile to localStorage:', e);
  }
};

export const loadClientProfile = async (userId: string): Promise<ClientProfileData | null> => {
  // Try to load from cache first for immediate response
  const cachedProfile = getCachedProfile(userId);
  
  try {
    // Load basic client info
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (clientError) {
      console.warn('⚠️ Error loading clients table:', clientError);
      // If we have cached data, use it instead of failing
      if (cachedProfile) {
        console.log('🔄 Using cached profile due to clients table error');
        return cachedProfile;
      }
      throw clientError;
    }

    // Load profile data including personal info
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('location, first_name, last_name, phone')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('⚠️ Error loading profiles table:', profileError);
      // If we have cached data, use it instead of failing
      if (cachedProfile) {
        console.log('🔄 Using cached profile due to profiles table error');
        return cachedProfile;
      }
      throw profileError;
    }

    // Load client preferences
    console.log('🔍 Loading preferences for user:', userId);
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('client_preferences')
      .select('*')
      .eq('client_id', userId)
      .maybeSingle();

    if (preferencesError) {
      console.warn('⚠️ Error loading client_preferences table:', preferencesError);
      // If we have cached data, use it instead of failing
      if (cachedProfile) {
        console.log('🔄 Using cached profile due to preferences table error');
        return cachedProfile;
      }
      throw preferencesError;
    }

    // FIXED: Only return null if we have absolutely no data from any table
    // This prevents the profile from disappearing if one table has no data
    if (!clientData && !preferencesData && !profileData) {
      console.warn('⚠️ No profile data found for user:', userId);
      return null;
    }

    // Log if we're missing data from specific tables
    if (!profileData) console.warn('⚠️ Missing profiles table data for user:', userId);
    if (!clientData) console.warn('⚠️ Missing clients table data for user:', userId);
    if (!preferencesData) console.warn('⚠️ Missing client_preferences data for user:', userId);

    // Convert ages back to string format - keep original format if it's already a string
    const childrenAges = (clientData?.children_ages || []).length > 0 
      ? (clientData.children_ages || []).map((age: any) => {
          if (!age || age === null || age === undefined || age === '') return '';
          
          // If it's already a string, return as is
          if (typeof age === 'string') return age;
          
          // If it's a number, convert appropriately
          if (typeof age === 'number') {
            return age < 1 ? `${Math.round(age * 12)} months` : `${Math.round(age)} years`;
          }
          
          return age.toString();
        }).filter(age => age !== '') // Remove empty ages
      : [''] // Default to one empty field if no children ages exist

    // Parse location from JSON or fallback to string parsing
    const location = profileData?.location || "";
    let parsedLocation = {
      streetAddress: '',
      estateInfo: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: ''
    };
    
    if (location) {
      try {
        // Try to parse as JSON first (new format)
        const addressJson = JSON.parse(location);
        parsedLocation = {
          streetAddress: addressJson.street || '',
          estateInfo: addressJson.estate || '',
          suburb: addressJson.suburb || '',
          city: addressJson.city || '',
          province: addressJson.province || '',
          postalCode: addressJson.postal || ''
        };
        console.log('📍 Parsed address from JSON:', parsedLocation);
      } catch (e) {
        // Fallback to old string parsing for backward compatibility
        console.log('📍 Parsing address from legacy string format');
        const parts = location.split(',').map(p => p.trim());
        
        if (parts.length >= 1) parsedLocation.streetAddress = parts[0] || '';
        if (parts.length >= 2) parsedLocation.estateInfo = parts[1] || '';
        if (parts.length >= 3) parsedLocation.suburb = parts[2] || '';
        if (parts.length >= 4) parsedLocation.city = parts[3] || '';
        if (parts.length >= 5) parsedLocation.province = parts[4] || '';
        if (parts.length >= 6) parsedLocation.postalCode = parts[5] || '';
      }
    }
    
    console.log('📍 Final parsed location:', parsedLocation);
    
    const profileResult: ClientProfileData = {
      location: location,
      streetAddress: parsedLocation.streetAddress,
      estateInfo: parsedLocation.estateInfo,
      suburb: parsedLocation.suburb,
      city: parsedLocation.city,
      province: parsedLocation.province,
      postalCode: parsedLocation.postalCode,
      firstName: profileData?.first_name || "",
      lastName: profileData?.last_name || "",
      phone: profileData?.phone || "",
      numberOfChildren: clientData?.number_of_children || 0,
      childrenAges: childrenAges.length > 0 ? childrenAges : [''],
      otherDependents: clientData?.other_dependents || 0,
      petsInHome: clientData?.pets_in_home || "",
      homeSize: clientData?.home_size || "",
      specialNeeds: preferencesData?.special_needs || false,
      ecdTraining: preferencesData?.ecd_training || false,
      drivingSupport: (preferencesData as any)?.driving_support || false,
      cooking: preferencesData?.cooking || false,
      lightHouseKeeping: (preferencesData as any)?.light_house_keeping || false,
      errandRuns: (preferencesData as any)?.errand_runs || false,
      languages: preferencesData?.languages || "",
      montessori: preferencesData?.montessori || false,
      schedule: (preferencesData?.schedule as {
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
        sunday: boolean;
      }) || {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      backupNanny: preferencesData?.backup_nanny || false,
      livingArrangement: preferencesData?.living_arrangement,
      durationType: preferencesData?.duration_type as 'short_term' | 'long_term',
      bookingSubType: preferencesData?.booking_sub_type as 'date_night' | 'short_term' | 'school_holiday' | 'date_day' | 'emergency',
      selectedDates: preferencesData?.selected_dates || [],
      timeSlots: (preferencesData?.time_slots as Array<{ start: string; end: string }>) || [],
    };

    // Cache the successfully loaded profile
    cacheProfile(userId, profileResult);
    
    return profileResult;
  } catch (error: any) {
    console.error('❌ Error loading client profile:', error);
    
    // On network errors, return cached data if available
    if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.code === 'ERR_NETWORK' || error?.message?.includes('Failed to fetch')) {
      console.warn('⚠️ Network error detected, attempting to use cached profile');
      if (cachedProfile) {
        console.log('✅ Using cached profile due to network error');
        return cachedProfile;
      }
    }
    
    // If no cache available, return null
    return null;
  }
};
