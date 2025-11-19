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

    // Call transaction edge function for atomic save
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      throw new Error('Not authenticated');
    }

    console.log('🔐 Calling transaction edge function...');
    
    const { data, error } = await supabase.functions.invoke('save-client-profile-transaction', {
      body: { profileData: cleanedData },
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    });

    if (error) {
      console.error('❌ Transaction edge function error:', error);
      throw new Error(error.message || 'Failed to save profile');
    }

    if (!data?.success) {
      console.error('❌ Transaction failed:', data?.error);
      throw new Error(data?.error?.userMessage || 'Failed to save profile');
    }

    console.log('✅ Profile saved successfully via transaction');
    console.log('📊 Saved data:', data.savedData);
    
    return { 
      success: true,
      savedData: data.savedData
    };
    
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

export const loadClientProfile = async (userId: string): Promise<ClientProfileData | null> => {
  try {
    // Load basic client info
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (clientError) throw clientError;

    // Load profile data including personal info
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('location, first_name, last_name, phone')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    // Load client preferences
    console.log('🔍 Loading preferences for user:', userId);
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('client_preferences')
      .select('*')
      .eq('client_id', userId)
      .maybeSingle();

    if (preferencesError) throw preferencesError;

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
    
    return {
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
  } catch (error) {
    console.error('Error loading client profile:', error);
    return null;
  }
};
