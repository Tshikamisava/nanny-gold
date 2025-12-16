import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadClientProfile, saveClientProfile, ClientProfileData } from '@/services/clientProfileService';
import { useAuthContext } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// PHASE 2: Mutex to prevent concurrent saves
let saveMutex = false;

// Custom hook for client profile with proper error handling and loading states
export const useClientProfile = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for loading client profile
  const profileQuery = useQuery({
    queryKey: ['client-profile', user?.id],
    queryFn: async () => {
      console.log('🔍 useClientProfile: Fetching profile for user:', user?.id);
      if (!user?.id) throw new Error('User not authenticated');
      
      // Try to load from database (will use cache as fallback on network errors)
      const result = await loadClientProfile(user.id);
      console.log('📦 useClientProfile: Loaded profile data:', result);
      
      // If result is null, try to get from localStorage cache
      if (!result) {
        try {
          const cached = localStorage.getItem(`client-profile-${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.timestamp) {
              // Use cached data if it's less than 24 hours old
              if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                console.log('📦 useClientProfile: Using cached profile data');
                return parsed.data;
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ useClientProfile: Error reading cache:', e);
        }
      }
      
      return result;
    },
    enabled: !!user?.id,
    // Use cached data as initial data, but still fetch fresh
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnMount: true, // Refetch on mount but use cache as initial data
    retry: (failureCount, error) => {
      console.log('❌ useClientProfile: Query failed, attempt:', failureCount + 1, 'Error:', error);
      // Don't retry on authentication errors
      if (error.message?.includes('not authenticated')) return false;
      // Retry network errors up to 2 times
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return failureCount < 2;
      }
      return false;
    },
    // Use cached data as placeholder while fetching
    placeholderData: () => {
      if (!user?.id) return undefined;
      try {
        const cached = localStorage.getItem(`client-profile-${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.data && parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            return parsed.data;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      return undefined;
    }
  });

  // Mutation for saving client profile with enhanced error handling
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: ClientProfileData) => {
      // PHASE 2: Prevent concurrent saves
      if (saveMutex) {
        throw new Error('Save already in progress. Please wait.');
      }
      
      saveMutex = true;
      
      try {
        console.log('🚀 useClientProfile: Starting profile save mutation');
        
        if (!user?.id) {
          throw new Error('User not authenticated');
        }
        
        console.log('📝 useClientProfile: Calling saveClientProfile with data:', profileData);
        const result = await saveClientProfile(user.id, profileData);
        console.log('📄 useClientProfile: Save result:', result);
        
        if (!result.success) {
          const errorMessage = result.error?.userMessage || result.error?.message || 'Failed to save profile';
          console.error('❌ useClientProfile: Save failed:', result.error);
          throw new Error(errorMessage);
        }
        
        console.log('✅ useClientProfile: Profile saved successfully');
        return result;
      } finally {
        saveMutex = false;
      }
    },
    // PHASE 5: Add retry logic with exponential backoff
    retry: (failureCount, error) => {
      // Retry network errors up to 3 times
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        return failureCount < 3;
      }
      return false; // Don't retry validation errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onSuccess: async (result, profileData) => {
      console.log('🎉 useClientProfile: Save mutation succeeded');
      
      // PHASE 1 FIX: Invalidate cache to force fresh fetch from database
      await queryClient.invalidateQueries({ queryKey: ['client-profile', user?.id] });
      console.log('✅ useClientProfile: Cache invalidated, fresh data will be fetched');
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error('❌ useClientProfile: Save mutation failed:', error);
      
      // Enhanced error message based on error type
      let errorTitle = "Save Failed";
      let errorDescription = error.message || "Failed to save profile. Please try again.";
      
      if (error.message?.includes('children')) {
        errorTitle = "Family Information Error";
        errorDescription = "There was an issue saving your family information. Please check the children's ages and try again.";
      } else if (error.message?.includes('dependents')) {
        errorTitle = "Dependent Information Error";
        errorDescription = "There was an issue saving the number of other dependents. Please enter a valid number.";
      } else if (error.message?.includes('preferences')) {
        errorTitle = "Preferences Error";
        errorDescription = "There was an issue saving your preferences. Please try again.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    }
  });

  // Force refetch on mount to ensure fresh data
  const forceRefetch = () => {
    console.log('🔄 useClientProfile: Forcing cache invalidation and refetch');
    queryClient.invalidateQueries({ queryKey: ['client-profile', user?.id] });
    return profileQuery.refetch();
  };

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    saveProfile: saveProfileMutation.mutate,
    isSaving: saveProfileMutation.isPending,
    saveError: saveProfileMutation.error,
    saveResult: saveProfileMutation.data,
    refetch: profileQuery.refetch,
    forceRefetch
  };
};

// Hook for checking if profile is complete for app store compliance
export const useProfileCompletion = () => {
  const { profile, isLoading } = useClientProfile();

  // PHASE 2 FIX: Check booking-relevant data instead of personal details
  // Users can book without first_name/last_name/phone - focus on family/location/preferences
  const isComplete = !isLoading && profile ? (() => {
    // Check for family information (most important for matching)
    const hasFamilyInfo = profile.childrenAges.some(age => age.trim()) && profile.homeSize;
    
    // Check for location (required for nanny matching)
    const hasLocation = profile.city && profile.province;
    
    // Check for nanny preferences
    const hasNannyPreferences = profile.languages;
    
    // Profile is complete if user has family info, location, and preferences
    // (first_name, last_name, phone are NOT required for booking)
    return hasFamilyInfo && hasLocation && hasNannyPreferences;
  })() : false;

  const completionPercentage = !isLoading && profile ? (() => {
    let completed = 0;
    const total = 12;

    if (profile.firstName) completed++;
    if (profile.lastName) completed++;
    if (profile.phone) completed++;
    if (profile.streetAddress) completed++;
    if (profile.city) completed++;
    if (profile.province) completed++;
    if (profile.childrenAges.some(age => age.trim())) completed++;
    if (profile.homeSize) completed++;
    if (profile.languages) completed++;
    if (profile.livingArrangement) completed++;
    if (profile.schedule && Object.values(profile.schedule).some(Boolean)) completed++;

    return Math.round((completed / total) * 100);
  })() : 0;

  return {
    isComplete,
    completionPercentage,
    profile,
    isLoading
  };
};