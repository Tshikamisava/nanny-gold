import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, MessageSquare, DollarSign, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  activeNannies: number;
  totalClients: number;
  todayBookings: number;
  totalRevenue: number;
  supportTickets: number;
}

// Ultra-fast dashboard with minimal re-renders
export default memo(function FastDashboard() {
  console.log('🚀 FastDashboard loaded');
  
  // Single database call with aggressive caching
  const { data: stats, isLoading } = useQuery({
    queryKey: ['fast-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      console.time('Dashboard Query');
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      console.timeEnd('Dashboard Query');
      
      if (error) {
        console.error('Dashboard stats error:', error);
        throw error;
      }
      
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
    staleTime: 15 * 60 * 1000, // 15 minutes - very aggressive caching
    refetchInterval: false, // No auto-refetch
    retry: false, // No retries - fail fast
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Only fetch on first mount
  });

  // Memoized stat cards data to prevent re-renders
  const statCards = useMemo(() => [
    {
      title: "Active Nannies",
      value: stats?.activeNannies || 0,
      description: "Available today",
      icon: Users
    },
    {
      title: "Total Clients", 
      value: stats?.totalClients || 0,
      description: "Registered clients",
      icon: UserCheck
    },
    {
      title: "Bookings Today",
      value: stats?.todayBookings || 0,
      description: "Starting today", 
      icon: Calendar
    },
    {
      title: "Total Revenue",
      value: stats ? `R${stats.totalRevenue.toLocaleString()}` : "R0",
      description: "From confirmed bookings",
      icon: DollarSign
    },
    {
      title: "Support Tickets",
      value: stats?.supportTickets || 0,
      description: "Pending resolution",
      icon: MessageSquare
    }
  ], [stats]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-muted-foreground">Welcome to the NannyGold admin dashboard.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Static Status Cards - No dynamic data */}
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
                  <p className="text-sm text-muted-foreground">Development mode active</p>
                </div>
                <Badge variant="secondary">Dev Mode</Badge>
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
    </div>
  );
});