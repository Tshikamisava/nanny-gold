import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadNannyProfile, saveNannyProfile, NannyProfileData } from '@/services/nannyProfileService';
import { useAuthContext } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// Custom hook for nanny profile with proper error handling and loading states (like useClientProfile)
export const useNannyProfile = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for loading nanny profile
  const profileQuery = useQuery({
    queryKey: ['nanny-profile', user?.id],
    queryFn: async () => {
      console.log('🔍 useNannyProfile: Fetching profile for user:', user?.id);
      if (!user?.id) throw new Error('User not authenticated');
      
      // Always fetch fresh from database first (don't rely on localStorage for cross-device sync)
      const result = await loadNannyProfile(user.id);
      console.log('📦 useNannyProfile: Loaded profile data from database:', result);
      
      // Save to localStorage for offline/fallback use (but don't use it as primary source)
      if (result && user.id) {
        try {
          localStorage.setItem(`nanny-profile-${user.id}`, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('⚠️ useNannyProfile: Error saving to localStorage:', e);
        }
      }
      
      // Only use localStorage cache if database returns null AND we have valid cached data
      // This is for offline scenarios, not cross-device sync
      if (!result) {
        try {
          const cached = localStorage.getItem(`nanny-profile-${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.timestamp) {
              // Only use cached data if it's less than 24 hours old (offline fallback)
              if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                console.log('📦 useNannyProfile: Database returned null, using cached data as fallback');
                return parsed.data;
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ useNannyProfile: Error reading cache:', e);
        }
      }
      
      return result;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always consider data stale - fetch fresh on mount/refocus for cross-device sync
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: true, // Refetch when user returns to window (ensures cross-device sync)
    refetchOnMount: true, // Always refetch on mount (ensures fresh data on new device)
    retry: (failureCount, error) => {
      console.log('❌ useNannyProfile: Query failed, attempt:', failureCount + 1, 'Error:', error);
      // Don't retry on authentication errors
      if (error.message?.includes('not authenticated')) return false;
      // Retry network errors up to 2 times
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return failureCount < 2;
      }
      return false;
    },
    // Use cached data as placeholder while fetching (for better UX, but always fetch fresh)
    placeholderData: () => {
      if (!user?.id) return undefined;
      try {
        const cached = localStorage.getItem(`nanny-profile-${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Use cached data as placeholder (just for UI, fresh data will load from DB)
          if (parsed.data && parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            console.log('📦 useNannyProfile: Using localStorage as placeholder while fetching fresh data');
            return parsed.data;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      return undefined;
    }
  });

  // Mutation for saving nanny profile with enhanced error handling
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<NannyProfileData>) => {
      console.log('🚀 useNannyProfile: Starting profile save mutation');
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      console.log('📝 useNannyProfile: Calling saveNannyProfile with data:', profileData);
      const result = await saveNannyProfile(user.id, profileData);
      console.log('📄 useNannyProfile: Save result:', result);
      
      if (!result.success) {
        const errorMessage = result.error?.userMessage || result.error?.message || 'Failed to save profile';
        console.error('❌ useNannyProfile: Save failed:', result.error);
        throw new Error(errorMessage);
      }
      
      console.log('✅ useNannyProfile: Profile saved successfully');
      return result;
    },
    retry: (failureCount, error) => {
      // Retry network errors up to 3 times
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        return failureCount < 3;
      }
      return false; // Don't retry validation errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onSuccess: async (result, profileData) => {
      console.log('🎉 useNannyProfile: Save mutation succeeded');
      console.log('📦 useNannyProfile: Input data:', profileData);
      console.log('📄 useNannyProfile: Save result:', result);
      
      // CRITICAL: Use savedData from Edge Function (actual database state) instead of input profileData
      // The Edge Function now returns the actual saved data from the database, ensuring we have the real saved state
      const savedDataFromDB = result?.savedData || profileData;
      console.log('📦 useNannyProfile: Using savedData from database:', savedDataFromDB);
      
      // Update cache with actual saved data from database (not just optimistic update)
      queryClient.setQueryData(['nanny-profile', user?.id], (oldData: any) => {
        console.log('🔄 useNannyProfile: Updating cache with saved data from database');
        console.log('📦 Old data first_name:', oldData?.first_name, 'last_name:', oldData?.last_name);
        // Merge with old data to preserve fields that weren't updated
        const updated = { ...(oldData || {}), ...savedDataFromDB };
        console.log('✅ New data (from DB) first_name:', updated.first_name, 'last_name:', updated.last_name);
        return updated;
      });
      
      // Get the updated cache data for localStorage
      const updatedCacheData = queryClient.getQueryData(['nanny-profile', user?.id]);
      
      // Save to localStorage for persistence across sessions (like client profile)
      if (user?.id && updatedCacheData) {
        try {
          localStorage.setItem(`nanny-profile-${user.id}`, JSON.stringify({
            data: updatedCacheData,
            timestamp: Date.now()
          }));
          console.log('💾 useNannyProfile: Saved to localStorage for session persistence');
        } catch (e) {
          console.warn('⚠️ useNannyProfile: Error saving to localStorage:', e);
        }
      }
      
      // Don't invalidate immediately - we already have the saved data from the Edge Function
      // This prevents an unnecessary refetch that might return null
      // The cache now contains the actual saved data from the database
      console.log('✅ useNannyProfile: Cache updated with saved data from database - no invalidation needed');
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error('❌ useNannyProfile: Save mutation failed:', error);
      
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Force refetch on mount to ensure fresh data
  const forceRefetch = () => {
    console.log('🔄 useNannyProfile: Forcing cache invalidation and refetch');
    queryClient.invalidateQueries({ queryKey: ['nanny-profile', user?.id] });
    return profileQuery.refetch();
  };

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    saveProfile: saveProfileMutation.mutateAsync, // Use mutateAsync so caller can await
    isSaving: saveProfileMutation.isPending,
    saveError: saveProfileMutation.error,
    saveResult: saveProfileMutation.data,
    refetch: profileQuery.refetch,
    forceRefetch
  };
};

