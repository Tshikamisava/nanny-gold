import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedAdminData {
  dashboardStats: {
    activeNannies: number;
    totalClients: number;
    todayBookings: number;
    totalRevenue: number;
    supportTickets: number;
  };
  revenueBreakdown: {
    totalRevenue: number;
    placementFees: number;
    commissionRevenue: number;
    bookingCount: number;
  };
  bookingStats: {
    pending: number;
    confirmed: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  nannyStats: {
    approved: number;
    pending: number;
    available: number;
    totalEarnings: number;
  };
}

export function useUnifiedAdminData() {
  return useQuery({
    queryKey: ['unified-admin-data'],
    queryFn: async (): Promise<UnifiedAdminData> => {
      // Get dashboard stats
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_dashboard_stats');
      
      if (dashboardError) {
        console.error('Dashboard stats error:', dashboardError);
        throw dashboardError;
      }

      // Get revenue breakdown using unified function
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('calculate_unified_revenue');
      
      if (revenueError) {
        console.error('Revenue calculation error:', revenueError);
        throw revenueError;
      }

      // Get booking status counts
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('status');

      if (bookingsError) {
        console.error('Bookings error:', bookingsError);
        throw bookingsError;
      }

      // Get nanny stats
      const { data: nanniesData, error: nanniesError } = await supabase
        .from('nannies')
        .select('approval_status, is_available');

      if (nanniesError) {
        console.error('Nannies error:', nanniesError);
        throw nanniesError;
      }

      // Get total nanny earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('booking_financials')
        .select('nanny_earnings')
        .not('nanny_earnings', 'is', null);

      if (earningsError) {
        console.error('Earnings error:', earningsError);
        throw earningsError;
      }

      // Process data
      const dashboardStats = dashboardData?.[0] || {
        active_nannies: 0,
        total_clients: 0,
        today_bookings: 0,
        total_revenue: 0,
        support_tickets: 0
      };
      const revenueStats = revenueData?.[0] || {
        total_revenue: 0,
        placement_fees: 0,
        commission_revenue: 0,
        booking_count: 0
      };
      
      // Process booking stats
      const bookingStats = {
        pending: bookingsData?.filter(b => b.status === 'pending').length || 0,
        confirmed: bookingsData?.filter(b => b.status === 'confirmed').length || 0,
        active: bookingsData?.filter(b => b.status === 'active').length || 0,
        completed: bookingsData?.filter(b => b.status === 'completed').length || 0,
        cancelled: bookingsData?.filter(b => b.status === 'cancelled').length || 0,
      };

      // Process nanny stats
      const nannyStats = {
        approved: nanniesData?.filter(n => n.approval_status === 'approved').length || 0,
        pending: nanniesData?.filter(n => n.approval_status === 'pending').length || 0,
        available: nanniesData?.filter(n => n.is_available === true).length || 0,
        totalEarnings: earningsData?.reduce((sum, e) => sum + (Number(e.nanny_earnings) || 0), 0) || 0,
      };

      return {
        dashboardStats: {
          activeNannies: Number(dashboardStats.active_nannies) || 0,
          totalClients: Number(dashboardStats.total_clients) || 0,
          todayBookings: Number(dashboardStats.today_bookings) || 0,
          totalRevenue: Math.round(Number(dashboardStats.total_revenue) || 0),
          supportTickets: Number(dashboardStats.support_tickets) || 0,
        },
        revenueBreakdown: {
          totalRevenue: Math.round(Number(revenueStats.total_revenue) || 0),
          placementFees: Math.round(Number(revenueStats.placement_fees) || 0),
          commissionRevenue: Math.round(Number(revenueStats.commission_revenue) || 0),
          bookingCount: Number(revenueStats.booking_count) || 0,
        },
        bookingStats,
        nannyStats,
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: 2,
    retryDelay: 1000,
  });
}

// Hook specifically for real-time booking updates
export function useRealtimeBookingUpdates() {
  return useQuery({
    queryKey: ['realtime-booking-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_type,
          total_monthly_cost,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 15 * 1000, // Auto-refresh every 15 seconds for real-time feel
    retry: 1,
  });
}

// Hook for admin audit trail
export function useAdminAuditTrail(limit: number = 20) {
  return useQuery({
    queryKey: ['admin-audit-trail', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_booking_actions')
        .select(`
          *,
          bookings!inner(
            id,
            booking_type,
            status,
            clients!inner(
              profiles!inner(first_name, last_name)
            )
          ),
          profiles!admin_booking_actions_admin_id_fkey(
            first_name,
            last_name
          )
        `)
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}