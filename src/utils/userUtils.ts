import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'client' | 'nanny' | 'admin';

export const getUserRole = async (userId: string, retryCount = 0): Promise<UserRole> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = [500, 1000, 2000]; // Exponential backoff
  
  console.log('🔍 getUserRole called for user:', userId, 'retry:', retryCount);
  
  try {
    // First get the user data to check metadata as fallback
    const { data: { user } } = await supabase.auth.getUser();
    const userMetadata = user?.user_metadata;
    const userTypeFromMetadata = userMetadata?.user_type;
    
    console.log('🔍 User metadata user_type:', userTypeFromMetadata);
    
    // Check for admin role first
    const { data: adminRole, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    console.log('🔍 Admin role check:', { adminRole, adminError });
    if (adminRole) {
      console.log('🔍 User is admin');
      return 'admin';
    }

    // Check if user has nanny profile
    const { data: nannyProfile, error: nannyError } = await supabase
      .from('nannies')
      .select('id, approval_status')
      .eq('id', userId)
      .maybeSingle();

    console.log('🔍 Nanny profile check:', { nannyProfile, nannyError });
    if (nannyProfile) {
      console.log('🔍 User is nanny with status:', nannyProfile.approval_status);
      return 'nanny';
    }

    // Check if user has client profile
    const { data: clientProfile, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    console.log('🔍 Client profile check:', { clientProfile, clientError });
    if (clientProfile) {
      console.log('🔍 User is client');
      return 'client';
    }

    // No profile found - might be race condition with trigger
    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      console.log(`🔍 No profile found, retrying in ${RETRY_DELAY[retryCount]}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY[retryCount]));
      return getUserRole(userId, retryCount + 1);
    }

    // After retries, use metadata as fallback
    if (userTypeFromMetadata === 'nanny') {
      console.log('🔍 No database profile after retries, but metadata shows nanny - using metadata fallback');
      return 'nanny';
    } else if (userTypeFromMetadata === 'admin') {
      console.log('🔍 No database profile after retries, but metadata shows admin - using metadata fallback');
      return 'admin';
    }

    // Default to client if no specific profile found
    console.log('🔍 No specific profile found after retries, defaulting to client role');
    return 'client';
  } catch (error) {
    console.error('🔍 Error in getUserRole:', error);
    return 'client';
  }
};

export const getUserTenantRoute = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'nanny':
      return '/nanny';
    case 'client':
    default:
      return '/dashboard'; // Route clients to main dashboard instead of /client
  }
};

// Development mode flag - COMPLETELY DISABLED to prevent auto-login
export const isDevelopmentMode = false;

export const getFallbackRoute = (user: any): string => {
  // Use user metadata as fallback if role detection fails
  const userType = user?.user_metadata?.user_type;
  
  if (userType === 'nanny') {
    return '/nanny';
  } else if (userType === 'admin') {
    return '/admin';
  } else {
    return '/dashboard'; // route clients to main dashboard
  }
};