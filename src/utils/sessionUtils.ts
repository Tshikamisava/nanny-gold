import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced session validation with automatic retry and detailed logging
 */
export const ensureValidSession = async (retryCount = 0, maxRetries = 3) => {
  const attempt = retryCount + 1;
  console.log(`🔐 Session validation attempt ${attempt}/${maxRetries + 1}`);
  
  try {
    // Step 1: Check current session
    console.log('📋 Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
      return { session: null, error: sessionError, needsLogin: true };
    }
    
    if (!session) {
      console.warn('⚠️  No active session found');
      return { session: null, error: null, needsLogin: true };
    }
    
    console.log('✅ Session found:', {
      userId: session.user?.id,
      email: session.user?.email,
      expiresAt: new Date(session.expires_at! * 1000).toLocaleString()
    });
    
    // Step 2: Verify session is valid and user exists
    console.log('👤 Verifying user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User verification failed:', userError);
      
      if (retryCount < maxRetries) {
        console.log('🔄 Attempting session refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError);
          return { session: null, error: refreshError, needsLogin: true };
        }
        
        console.log('✅ Session refreshed, retrying validation...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
        return ensureValidSession(retryCount + 1, maxRetries);
      }
      
      return { session: null, error: userError, needsLogin: true };
    }
    
    if (!user) {
      console.error('❌ No user after verification');
      return { session: null, error: new Error('User verification returned null'), needsLogin: true };
    }
    
    // Step 3: Comprehensive database connectivity tests with auth.uid()
    console.log('🗄️  Testing comprehensive database auth connectivity...');
    try {
      // Test 1: Basic profile query
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .limit(1)
        .single();
      
      // Test 2: Admin function test
      const { data: adminTest, error: adminError } = await supabase
        .rpc('is_admin');
      
      // Test 3: Direct auth.uid() test via query
      const { data: authTest, error: authError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .limit(1);
      
      console.log('🧪 Database connectivity test results:', {
        profileQuery: profileError ? `Failed: ${profileError.message}` : 'Success',
        adminFunction: adminError ? `Failed: ${adminError.message}` : `Success (${adminTest})`,
        authUidTest: authError ? `Failed: ${authError.message}` : 'Success',
        sessionUser: user.id,
        profileFound: profileTest?.id === user.id
      });
      
      // If admin function fails, that's the critical issue
      if (adminError) {
        console.error('🚨 CRITICAL: auth.uid() not working in database functions');
        throw new Error('Database authentication not working - auth.uid() returns null');
      }
      
    } catch (dbTestError) {
      console.error('🚨 Database connectivity test failed:', dbTestError);
      throw dbTestError;
    }
    
    console.log('🎉 Session validation successful!');
    return { 
      session, 
      user, 
      error: null, 
      needsLogin: false,
      validatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('💥 Session validation critical error:', error);
    return { session: null, error, needsLogin: true };
  }
};

/**
 * Enhanced database operation wrapper with session validation and retry logic
 */
export const withValidSession = async <T>(
  operation: () => Promise<T>,
  operationName = 'Database operation',
  maxRetries = 2
): Promise<{ data: T | null; error: any; needsLogin: boolean }> => {
  console.log(`🚀 Starting ${operationName}...`);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    console.log(`🔄 ${operationName} attempt ${attempt + 1}/${maxRetries + 1}`);
    
    // Validate session before each attempt
    const sessionCheck = await ensureValidSession();
    
    if (sessionCheck.needsLogin) {
      console.error(`❌ ${operationName} failed: No valid session`);
      return { 
        data: null, 
        error: sessionCheck.error || new Error('Authentication required'), 
        needsLogin: true 
      };
    }
    
    try {
      console.log(`⚡ Executing ${operationName}...`);
      const result = await operation();
      console.log(`✅ ${operationName} completed successfully`);
      return { data: result, error: null, needsLogin: false };
      
    } catch (error: any) {
      console.error(`❌ ${operationName} attempt ${attempt + 1} failed:`, error);
      
      // Check if it's an auth-related error
      if (error?.code === 'PGRST301' || error?.message?.includes('auth.uid()') || 
          error?.message?.includes('JWT') || error?.message?.includes('session')) {
        
        if (attempt < maxRetries) {
          console.log(`🔄 Auth error detected, refreshing session and retrying...`);
          await forceSessionRefresh();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }
        
        return { data: null, error, needsLogin: true };
      }
      
      // Non-auth error, don't retry
      return { data: null, error, needsLogin: false };
    }
  }
  
  return { 
    data: null, 
    error: new Error(`${operationName} failed after ${maxRetries + 1} attempts`), 
    needsLogin: false 
  };
};

/**
 * Forces a complete session refresh and verification
 */
export const forceSessionRefresh = async () => {
  console.log('🔄 Forcing session refresh...');
  
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Force refresh failed:', error);
      return { success: false, error };
    }
    
    if (!session) {
      console.error('❌ No session after refresh');
      return { success: false, error: new Error('No session returned from refresh') };
    }
    
    // Verify the refresh worked
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User verification after refresh failed:', userError);
      return { success: false, error: userError || new Error('No user after refresh') };
    }
    
    console.log('✅ Session force refresh successful');
    return { success: true, session, user };
  } catch (error) {
    console.error('💥 Force refresh critical error:', error);
    return { success: false, error };
  }
};

/**
 * Clear all authentication data and force re-login
 */
export const clearAuthData = async () => {
  console.log('🧹 Clearing all auth data...');
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ Auth data cleared successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    return { success: false, error };
  }
};