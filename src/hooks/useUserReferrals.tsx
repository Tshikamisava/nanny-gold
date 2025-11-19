import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserReferralData {
  referralCode: string | null;
  totalEarned: number;
  totalRedeemed: number;
  availableBalance: number;
  referrals: ReferralEntry[];
}

export interface ReferralEntry {
  id: string;
  referred_user_name: string;
  placement_fee: number;
  reward_percentage: number;
  reward_amount: number;
  status: 'Pending' | 'Approved' | 'Paid';
  created_at: string;
}

export interface RewardBalance {
  id: string;
  user_id: string;
  total_earned: number;
  total_redeemed: number;
  available_balance: number;
  last_updated: string;
}

export const useUserReferrals = () => {
  return useQuery({
    queryKey: ['user-referrals'],
    queryFn: async (): Promise<UserReferralData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's referral code
      const { data: referralParticipant } = await supabase
        .from('referral_participants')
        .select('referral_code')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      // Get user's referral logs with referred user details
      const { data: referralLogs } = await supabase
        .from('referral_logs')
        .select(`
          id,
          referred_user_id,
          placement_fee,
          reward_percentage,
          reward_amount,
          status,
          created_at,
          referrer:referral_participants!inner(user_id)
        `)
        .eq('referral_participants.user_id', user.id)
        .order('created_at', { ascending: false });

      // Get referred user names
      const referrals: ReferralEntry[] = [];
      if (referralLogs) {
        for (const log of referralLogs) {
          const { data: referredUser } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', log.referred_user_id)
            .single();

          referrals.push({
            id: log.id,
            referred_user_name: referredUser 
              ? `${referredUser.first_name} ${referredUser.last_name}`.trim()
              : 'Unknown User',
            placement_fee: log.placement_fee || 0,
            reward_percentage: log.reward_percentage || 0,
            reward_amount: log.reward_amount || 0,
            status: log.status as 'Pending' | 'Approved' | 'Paid',
            created_at: log.created_at
          });
        }
      }

      // Get reward balance
      const { data: rewardBalance } = await supabase
        .from('reward_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return {
        referralCode: referralParticipant?.referral_code || null,
        totalEarned: rewardBalance?.total_earned || 0,
        totalRedeemed: rewardBalance?.total_redeemed || 0,
        availableBalance: rewardBalance?.available_balance || 0,
        referrals
      };
    },
  });
};

export const useApplyRewards = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create redemption record
      const { data, error } = await supabase
        .from('reward_redemptions')
        .insert({
          user_id: user.id,
          amount_redeemed: amount,
          redemption_type: 'booking_payment',
          notes: 'Applied to future booking payment'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-referrals'] });
      toast({
        title: "Success",
        description: "Rewards applied successfully to your account",
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

export const useCopyReferralCode = () => {
  const { toast } = useToast();

  return (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy referral code",
        variant: "destructive",
      });
    });
  };
};