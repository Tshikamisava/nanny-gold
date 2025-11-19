import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveClientProfile } from '@/services/clientProfileService';

export const usePreferenceSync = () => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCookingPreference = useCallback(async (cookingValue: boolean, onSuccess?: (value: boolean) => void) => {
    setIsUpdating(true);
    console.log('🍳 Updating cooking preference to:', cookingValue);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Auto-sync to both booking preferences AND profile settings
      console.log('🔄 Syncing cooking preference to database and profile...');
      
      // Update client preferences (for booking flow)
      const { error: preferencesError } = await supabase
        .from('client_preferences')
        .upsert({ 
          client_id: user.id,
          cooking: cookingValue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        });

      if (preferencesError) {
        throw preferencesError;
      }

      // Also sync to main profile settings for consistency
      const profileResult = await saveClientProfile(user.id, { 
        cooking: cookingValue,
        location: '',
        childrenAges: [],
        specialNeeds: false,
        ecdTraining: false,
        drivingSupport: false,
        languages: ''
      });

      if (!profileResult.success) {
        console.warn('⚠️ Profile sync had issues but preferences updated successfully');
      }

      console.log('✅ Cooking preference synced successfully across all systems');
      
      // Call success callback with the exact value that was set
      if (onSuccess) {
        onSuccess(cookingValue);
      }

      toast({
        title: "Preference Updated",
        description: `Cooking support ${cookingValue ? 'enabled' : 'disabled'}`,
      });

      return true;
    } catch (error: any) {
      console.error('💥 Failed to update cooking preference:', error);
      
      toast({
        title: "Update Failed",
        description: `Failed to update cooking preference: ${error.message}`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [toast]);

  return {
    updateCookingPreference,
    isUpdating
  };
};