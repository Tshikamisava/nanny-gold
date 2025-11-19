import React, { memo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, MessageSquare, DollarSign, UserCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preloadAdminData } from '@/utils/dataPreloader';

interface DashboardStats {
  activeNannies: number;
  totalClients: number;
  todayBookings: number;
  totalRevenue: number;
  supportTickets: number;
}

// Memoized stat card component to prevent unnecessary re-renders
const StatCard = memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  loading 
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {loading ? (
          <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
        ) : (
          value
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

// Memoized status section to prevent re-renders
const StatusSection = memo(() => (
  <div className="grid gap-4 md:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment System</p>
              <p className="text-sm text-muted-foreground">All operations normal</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Database</p>
              <p className="text-sm text-muted-foreground">Connected and responsive</p>
            </div>
            <Badge variant="default">Healthy</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Authentication</p>
              <p className="text-sm text-muted-foreground">All systems operational</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payments & Finance</p>
              <p className="text-sm text-muted-foreground">Manage financial operations</p>
            </div>
            <Badge variant="outline">Available</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Nanny Management</p>
              <p className="text-sm text-muted-foreground">Review applications</p>
            </div>
            <Badge variant="outline">Available</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Support Center</p>
              <p className="text-sm text-muted-foreground">Handle user inquiries</p>
            </div>
            <Badge variant="outline">Available</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
));

StatusSection.displayName = 'StatusSection';

export default memo(function OptimizedAdminOverview() {
  const queryClient = useQueryClient();
  
  // Preload admin data when component mounts
  useEffect(() => {
    preloadAdminData(queryClient);
  }, [queryClient]);
  
  console.log('OptimizedAdminOverview component loaded successfully');
  
  // Single optimized query using database function
  const { data: stats = {
    activeNannies: 0,
    totalClients: 0,
    todayBookings: 0,
    totalRevenue: 0,
    supportTickets: 0
  }, isLoading: loading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
      if (error) throw error;
      
      const result = data?.[0] || {
        active_nannies: 0,
        total_clients: 0,
        today_bookings: 0,
        total_revenue: 0,
        support_tickets: 0
      };

      return {
        activeNannies: Number(result.active_nannies) || 0,
        totalClients: Number(result.total_clients) || 0,
        todayBookings: Number(result.today_bookings) || 0,
        totalRevenue: Math.round(Number(result.total_revenue)) || 0,
        supportTickets: Number(result.support_tickets) || 0
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: false, // Disable auto-refetch
    retry: 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-muted-foreground">
          Welcome to the NannyGold admin dashboard.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Nannies"
          value={stats.activeNannies}
          description="Available today"
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          description="Registered clients"
          icon={UserCheck}
          loading={loading}
        />
        <StatCard
          title="Bookings Today"
          value={stats.todayBookings}
          description="Starting today"
          icon={Calendar}
          loading={loading}
        />
        <StatCard
          title="Admin Revenue"
          value={`R${stats.totalRevenue.toLocaleString()}`}
          description="Actual admin earnings"
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Support Tickets"
          value={stats.supportTickets}
          description="Pending resolution"
          icon={MessageSquare}
          loading={loading}
        />
      </div>

      {/* Status Cards */}
      <StatusSection />
    </div>
  );
});