import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';

// Helper function to generate unique Jitsi Meet room names and links
export const generateJitsiRoomName = (interviewId: string): string => {
  return `nannygold-interview-${interviewId}`;
};

export const generateJitsiLink = (interviewId: string): string => {
  const roomName = generateJitsiRoomName(interviewId);
  return `https://meet.jit.si/${roomName}`;
};

export interface Interview {
  id: string;
  client_id: string;
  nanny_id: string;
  interview_date: string;
  interview_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  meeting_link?: string;
  calendar_event_id?: string;
  notes?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  nanny_name?: string;
  nanny_email?: string;
  client_name?: string;
}

export const useInterviews = () => {
  const { user } = useAuthContext();
  
  console.log('useInterviews - User ID:', user?.id);
  
  return useQuery({
    queryKey: ['interviews', user?.id],
    queryFn: async (): Promise<Interview[]> => {
      if (!user?.id) {
        console.log('useInterviews - No user ID, returning empty array');
        return [];
      }
      
      console.log('useInterviews - Fetching interviews for:', user.id);
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          nanny_profiles:nannies!interviews_nanny_id_fkey(
            profiles!nannies_id_fkey(first_name, last_name, email)
          ),
          client_profiles:clients!interviews_client_id_fkey(
            profiles!clients_id_fkey(first_name, last_name, email)
          )
        `)
        .or(`client_id.eq.${user.id},nanny_id.eq.${user.id}`)
        .order('interview_date', { ascending: true });
      
      if (error) {
        console.error('useInterviews - Query error:', error);
        throw error;
      }
      
      console.log('useInterviews - Fetched interviews count:', data?.length || 0);
      
      return data.map((interview: any) => ({
        ...interview,
        nanny_name: interview.nanny_profiles?.profiles ? 
          `${interview.nanny_profiles.profiles.first_name || ''} ${interview.nanny_profiles.profiles.last_name || ''}`.trim() : '',
        nanny_email: interview.nanny_profiles?.profiles?.email || '',
        client_name: interview.client_profiles?.profiles ? 
          `${interview.client_profiles.profiles.first_name || ''} ${interview.client_profiles.profiles.last_name || ''}`.trim() : ''
      })) as Interview[];
    },
    enabled: !!user?.id
  });
};

export const useCreateInterview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (interviewData: {
      nanny_id: string;
      interview_date: string;
      interview_time: string;
      meeting_link?: string;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // First insert to get the interview ID
      const { data, error } = await supabase
        .from('interviews')
        .insert({
          ...interviewData,
          client_id: userData.user.id,
          status: 'scheduled',
          meeting_link: interviewData.meeting_link // Will be updated below if not provided
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Generate Jitsi link if not provided
      if (!interviewData.meeting_link && data) {
        const jitsiLink = generateJitsiLink(data.id);
        const { error: updateError } = await supabase
          .from('interviews')
          .update({ meeting_link: jitsiLink })
          .eq('id', data.id);
        
        if (updateError) console.error('Failed to update Jitsi link:', updateError);
        data.meeting_link = jitsiLink;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast({
        title: "Interview Scheduled",
        description: `Interview has been scheduled successfully.`
      });
    },
    onError: (error) => {
      console.error('Interview creation error:', error);
      toast({
        title: "Error",
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateInterview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Interview> 
    }) => {
      const { data, error } = await supabase
        .from('interviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast({
        title: "Interview Updated",
        description: "Interview has been updated successfully."
      });
    },
    onError: (error) => {
      console.error('Interview update error:', error);
      toast({
        title: "Error",
        description: "Failed to update interview. Please try again.",
        variant: "destructive"
      });
    }
  });
};

export const useCancelInterview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      cancellation_reason 
    }: { 
      id: string; 
      cancellation_reason: string;
    }) => {
      const { data, error } = await supabase
        .from('interviews')
        .update({
          status: 'cancelled',
          cancelled_by: (await supabase.auth.getUser()).data.user?.id,
          cancellation_reason
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast({
        title: "Interview Cancelled",
        description: "Interview has been cancelled successfully."
      });
    },
    onError: (error) => {
      console.error('Interview cancellation error:', error);
      toast({
        title: "Error",
        description: "Failed to cancel interview. Please try again.",
        variant: "destructive"
      });
    }
  });
};