import { supabase } from "@/integrations/supabase/client";

export interface NannyProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  bio?: string;
  experience_level?: string;
  languages?: string[];
  skills?: string[];
  hourly_rate?: number;
  monthly_rate?: number;
}

interface SaveProfileResult {
  success: boolean;
  error?: {
    message: string;
    userMessage: string;
    [key: string]: any;
  };
  savedData?: any;
}

export const saveNannyProfile = async (
  userId: string,
  profileData: Partial<NannyProfileData>
): Promise<SaveProfileResult> => {
  console.log('💾 saveNannyProfile called for user:', userId);
  console.log('📦 Profile data received:', profileData);
  
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      throw new Error('Not authenticated');
    }

    console.log('🔐 Calling transaction edge function...');
    
    // Use Edge Function (like client profile) to bypass RLS
    const { data, error } = await supabase.functions.invoke('save-nanny-profile-transaction', {
      body: { profileData },
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

    console.log('✅ Nanny profile saved successfully via edge function');
    
    return { 
      success: true,
      savedData: data.savedData || profileData
    };
    
  } catch (error: any) {
    console.error('❌ saveNannyProfile: Error occurred:', error);
    
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

export const loadNannyProfile = async (userId: string): Promise<NannyProfileData | null> => {
  try {
    console.log('🔍 loadNannyProfile: Loading profile for user:', userId);

    // Load profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error loading profiles table:', profileError);
      // Don't throw - gracefully handle missing data (like client profile does)
      console.warn('⚠️ Profiles table error, continuing with nanny data only');
    }

    // Load nanny data
    const { data: nannyData, error: nannyError } = await supabase
      .from('nannies')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (nannyError) {
      console.error('❌ Error loading nannies table:', nannyError);
      // Don't throw - gracefully handle missing data (like client profile does)
      console.warn('⚠️ Nannies table error, continuing with profile data only');
    }

    // CRITICAL FIX: Return null if both are null/empty (don't return empty object)
    // This prevents React Query from overwriting optimistic updates with empty data
    if (!profileData && !nannyData) {
      console.warn('⚠️ No profile data found for user:', userId);
      return null;
    }

    // Combine data (only if at least one source has data)
    const combinedProfile: NannyProfileData = {
      ...(profileData || {}),
      ...(nannyData || {})
    };

    console.log('✅ Nanny profile loaded successfully');
    console.log('📦 Profile data keys:', profileData ? Object.keys(profileData) : 'null');
    console.log('📦 Nanny data keys:', nannyData ? Object.keys(nannyData) : 'null');
    console.log('📦 Combined profile keys:', Object.keys(combinedProfile));
    
    return combinedProfile;
  } catch (error: any) {
    console.error('❌ Error loading nanny profile:', error);
    return null;
  }
};

