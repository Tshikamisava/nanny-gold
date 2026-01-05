import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NannyProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  experience_level?: string | null;
  languages?: string[] | null;
  skills?: string[] | null;
  hourly_rate?: number | null;
  monthly_rate?: number | null;
  avatar_url?: string | null;
}

export const useOptimizedProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimized profile query with caching
  const {
    data: profile = {} as NannyProfile,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['nanny-profile'],
    queryFn: async () => {
      console.log('🔄 Loading nanny profile...');
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Single optimized query with join
      const { data: combinedData, error: combinedError } = await supabase
        .from('profiles')
        .select(`
          *,
          nannies (
            bio,
            experience_level,
            languages,
            skills,
            hourly_rate,
            monthly_rate,
            approval_status,
            is_verified,
            is_available,
            can_receive_bookings,
            service_categories,
            admin_assigned_categories,
            admin_notes,
            created_at,
            updated_at
          )
        `)
        .eq('id', user.user.id)
        .single();

      if (combinedError) {
        console.error('❌ Error loading combined profile data:', combinedError);
        throw combinedError;
      }

      // Combine the data properly
      const combinedProfile: NannyProfile = {
        ...combinedData,
        ...(combinedData.nannies || {})
      };

      console.log('✅ Profile loaded successfully:', combinedProfile);
      return combinedProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Optimized update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ section, data }: { section: string; data: any }) => {
      console.log('🔄 Updating profile section:', section, 'with data:', data);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Update profiles table
      if (['first_name', 'last_name', 'email', 'phone', 'location', 'avatar_url'].includes(section)) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', user.user.id);
        
        if (profileError) {
          console.error('❌ Error updating profiles table:', profileError);
          throw profileError;
        }
        console.log('✅ Profiles table updated successfully');
      }

      // Update nannies table
      if (['bio', 'experience_level', 'languages', 'skills', 'hourly_rate', 'monthly_rate'].includes(section)) {
        const { error: nannyError } = await supabase
          .from('nannies')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', user.user.id);
        
        if (nannyError) {
          console.error('❌ Error updating nannies table:', nannyError);
          throw nannyError;
        }
        console.log('✅ Nannies table updated successfully');
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['nanny-profile'] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: any) => {
      console.error('❌ Error updating profile:', error);
      toast({ 
        title: "Error updating profile", 
        description: "Your changes may not have been saved. Please try again.",
        variant: "destructive" 
      });
    },
  });

  // Optimized photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user.id}/avatar.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update profile with new avatar URL
      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    },
    onSuccess: (avatarUrl) => {
      queryClient.setQueryData(['nanny-profile'], (old: NannyProfile) => ({
        ...old,
        avatar_url: avatarUrl
      }));
      toast({ title: "Profile picture updated successfully" });
    },
    onError: (error) => {
      console.error('❌ Error uploading photo:', error);
      toast({ 
        title: "Error uploading photo", 
        description: "Please try again.",
        variant: "destructive" 
      });
    },
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    uploadPhoto: uploadPhotoMutation.mutateAsync,
    isUploadingPhoto: uploadPhotoMutation.isPending,
  };
};
