import { useEffect, useRef } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Enhanced session monitoring hook with automatic recovery
 */
export const useSessionMonitor = () => {
  const { session, user } = useAuthContext();
  const { toast } = useToast();
  const lastValidationRef = useRef<number>(0);
  const recoveryAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (!session || !user) return;

    const validateSession = async () => {
      const now = Date.now();
      
      // Throttle validation to every 10 seconds
      if (now - lastValidationRef.current < 10000) return;
      lastValidationRef.current = now;

      try {
        console.log('🔍 Validating session for user:', user.id);
        
        // Test database connectivity with auth.uid()
        const { data: testData, error: testError } = await supabase
          .rpc('is_admin');

        if (testError) {
          console.warn('⚠️  Session validation failed:', testError);
          
          // Attempt recovery if we haven't tried recently
          if (recoveryAttemptRef.current < now - 30000) { // Max 1 recovery per 30 seconds
            recoveryAttemptRef.current = now;
            await attemptSessionRecovery();
          }
        } else {
          console.log('✅ Session validation successful');
          recoveryAttemptRef.current = 0; // Reset recovery attempts
        }
      } catch (error) {
        console.error('❌ Session validation error:', error);
      }
    };

    const attemptSessionRecovery = async () => {
      console.log('🔄 Attempting session recovery...');
      
      try {
        // Force session refresh
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Session recovery failed:', refreshError);
          
          toast({
            title: "Session Expired",
            description: "Please refresh the page and log in again",
            variant: "destructive",
          });
          
          // Force page refresh after 3 seconds
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          console.log('✅ Session recovered successfully');
          toast({
            title: "Session Restored",
            description: "Connection restored successfully",
          });
        }
      } catch (error) {
        console.error('💥 Session recovery critical error:', error);
      }
    };

    // Validate session immediately and then every 30 seconds
    validateSession();
    const interval = setInterval(validateSession, 30000);

    return () => clearInterval(interval);
  }, [session, user, toast]);

  return {
    isMonitoring: !!session && !!user
  };
};