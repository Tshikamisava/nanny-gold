import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ensureValidSession } from '@/utils/sessionUtils';

/**
 * Hook to fix cooking preferences and other client preference issues
 */
export const usePreferenceFix = () => {
  const { toast } = useToast();

  const updateCookingPreference = async (cooking: boolean) => {
    console.log('🍳 Fixing cooking preference update...');
    
    try {
      // Validate session first
      const sessionCheck = await ensureValidSession();
      if (sessionCheck.needsLogin) {
        console.error('🚨 Session invalid for cooking preference update');
        toast({
          title: "Session Expired",
          description: "Please refresh the page and try again",
          variant: "destructive",
        });
        return false;
      }

      console.log('🔐 Valid session found, updating cooking preference...');
      
      // Update client preferences with explicit user validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      console.log('👤 Updating preferences for user:', user.id);
      
      const { data, error } = await supabase
        .from('client_preferences')
        .upsert({ 
          client_id: user.id,
          cooking: cooking,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        });

      if (error) {
        console.error('❌ Cooking preference update failed:', error);
        throw error;
      }

      console.log('✅ Cooking preference updated successfully');
      
      toast({
        title: "Preference Updated",
        description: `Cooking support ${cooking ? 'enabled' : 'disabled'}`,
      });

      return true;
    } catch (error: any) {
      console.error('💥 Cooking preference fix failed:', error);
      
      toast({
        title: "Update Failed",
        description: `Failed to update cooking preference: ${error.message}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const validatePreferenceAccess = async () => {
    try {
      const sessionCheck = await ensureValidSession();
      if (sessionCheck.needsLogin) {
        return false;
      }

      // Test client preferences RLS policies
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('client_preferences')
        .select('cooking')
        .eq('client_id', user.id)
        .limit(1);

      if (error) {
        console.warn('⚠️  Client preferences access test failed:', error);
        return false;
      }

      console.log('✅ Client preferences access validated');
      return true;
    } catch (error) {
      console.error('❌ Preference validation failed:', error);
      return false;
    }
  };

  return {
    updateCookingPreference,
    validatePreferenceAccess
  };
};