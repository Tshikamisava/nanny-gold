import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  activeNannies: number;
  totalClients: number;
  todayBookings: number;
  totalRevenue: number;
  supportTickets: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Use the RPC function to get proper admin revenue calculations
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
      if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }

      // The RPC function returns a single row with all stats
      const stats = data?.[0];
      
      return {
        activeNannies: Number(stats?.active_nannies) || 0,
        totalClients: Number(stats?.total_clients) || 0,
        todayBookings: Number(stats?.today_bookings) || 0,
        totalRevenue: Math.round(Number(stats?.total_revenue)) || 0,
        supportTickets: Number(stats?.support_tickets) || 0
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
}