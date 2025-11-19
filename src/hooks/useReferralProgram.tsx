import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReferralParticipant {
  id: string;
  user_id: string;
  role: 'Client' | 'Nanny';
  referral_code: string;
  date_added: string;
  notes?: string;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  total_referrals?: number;
  total_rewards?: number;
}

export interface ReferralLog {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  placement_fee?: number;
  reward_percentage?: number;
  reward_amount?: number;
  status: 'Pending' | 'Approved' | 'Paid';
  notes?: string;
  created_at: string;
  updated_at: string;
  referrer?: ReferralParticipant;
  referred_user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export const useReferralParticipants = () => {
  return useQuery({
    queryKey: ['referral-participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_participants')
        .select('*')
        .order('date_added', { ascending: false });

      if (error) throw error;

      // Get user details and referral statistics for each participant
      const participantsWithStats = await Promise.all(
        data?.map(async (participant) => {
          // Get user details
          const { data: userData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone')
            .eq('id', participant.user_id)
            .single();

          // Get referral statistics
          const { data: logs } = await supabase
            .from('referral_logs')
            .select('reward_amount, status')
            .eq('referrer_id', participant.id);

          const total_referrals = logs?.length || 0;
          const total_rewards = logs?.reduce((sum, log) => sum + (log.reward_amount || 0), 0) || 0;

          return {
            ...participant,
            role: participant.role as 'Client' | 'Nanny',
            user: userData,
            total_referrals,
            total_rewards
          };
        }) || []
      );

      return participantsWithStats;
    },
  });
};

export const useReferralLogs = () => {
  return useQuery({
    queryKey: ['referral-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get related data for each referral log
      const logsWithDetails = await Promise.all(
        data?.map(async (log) => {
          // Get referrer details
          const { data: referrerData } = await supabase
            .from('referral_participants')
            .select('id, referral_code, role, user_id')
            .eq('id', log.referrer_id)
            .single();

          let referrerUser = null;
          if (referrerData) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', referrerData.user_id)
              .single();
            referrerUser = userData;
          }

          // Get referred user details
          const { data: referredUserData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', log.referred_user_id)
            .single();

          return {
            ...log,
            referrer: referrerData ? {
              ...referrerData,
              user: referrerUser
            } : null,
            referred_user: referredUserData
          };
        }) || []
      );

      return logsWithDetails;
    },
  });
};

export const useCreateReferralParticipant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participant: {
      user_id: string;
      role: 'Client' | 'Nanny';
      referral_code: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('referral_participants')
        .insert(participant)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-participants'] });
      toast({
        title: "Success",
        description: "Referral participant added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateReferralParticipant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReferralParticipant> }) => {
      const { data, error } = await supabase
        .from('referral_participants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-participants'] });
      toast({
        title: "Success",
        description: "Referral participant updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateReferralLog = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (referralLog: {
      referrer_id: string;
      referred_user_id: string;
      placement_fee?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('referral_logs')
        .insert(referralLog)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-logs'] });
      queryClient.invalidateQueries({ queryKey: ['referral-participants'] });
      toast({
        title: "Success",
        description: "Referral log created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateReferralLog = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReferralLog> }) => {
      const { data, error } = await supabase
        .from('referral_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-logs'] });
      queryClient.invalidateQueries({ queryKey: ['referral-participants'] });
      toast({
        title: "Success",
        description: "Referral log updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, user_type')
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });
};

export const useUsersWithoutReferralCodes = () => {
  return useQuery({
    queryKey: ['users-without-referral-codes'],
    queryFn: async () => {
      // Get all existing participant user IDs
      const { data: existingParticipants } = await supabase
        .from('referral_participants')
        .select('user_id');
      
      const existingUserIds = existingParticipants?.map(p => p.user_id) || [];
      
      // Get all users who are clients or nannies
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, user_type')
        .in('user_type', ['client', 'nanny'])
        .order('first_name');

      if (error) throw error;

      // Filter out users who already have referral codes
      return allUsers?.filter(user => !existingUserIds.includes(user.id)) || [];
    },
  });
};

export const useBulkCreateReferralParticipants = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participants: Array<{
      user_id: string;
      role: 'Client' | 'Nanny';
      referral_code: string;
      notes?: string;
    }>) => {
      const { data, error } = await supabase
        .from('referral_participants')
        .insert(participants)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['referral-participants'] });
      queryClient.invalidateQueries({ queryKey: ['users-without-referral-codes'] });
      toast({
        title: "Success",
        description: `${data.length} referral participants added successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};