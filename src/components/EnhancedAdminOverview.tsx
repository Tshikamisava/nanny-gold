import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Clock,
  Star,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useUnifiedAdminData, useRealtimeBookingUpdates, useAdminAuditTrail } from '@/hooks/useUnifiedAdminData';
import { formatCurrency } from '@/utils/pricingUtils';
import { format } from 'date-fns';

interface Props {
  className?: string;
}

export function EnhancedAdminOverview({ className }: Props) {
  const { 
    data: adminData, 
    isLoading: adminLoading, 
    error: adminError 
  } = useUnifiedAdminData();
  
  const { 
    data: realtimeBookings, 
    isLoading: bookingsLoading 
  } = useRealtimeBookingUpdates();
  
  const { 
    data: auditTrail, 
    isLoading: auditLoading 
  } = useAdminAuditTrail(5);

  if (adminLoading) {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (adminError) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>
              Failed to load admin dashboard data. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { dashboardStats, revenueBreakdown, bookingStats, nannyStats } = adminData || {
    dashboardStats: { activeNannies: 0, totalClients: 0, todayBookings: 0, totalRevenue: 0, supportTickets: 0 },
    revenueBreakdown: { totalRevenue: 0, placementFees: 0, commissionRevenue: 0, bookingCount: 0 },
    bookingStats: { pending: 0, confirmed: 0, active: 0, completed: 0, cancelled: 0 },
    nannyStats: { approved: 0, pending: 0, available: 0, totalEarnings: 0 }
  };

  const recentBookingTrend = realtimeBookings?.slice(0, 10).reduce((acc, booking) => {
    const today = new Date();
    const bookingDate = new Date(booking.created_at);
    const isToday = bookingDate.toDateString() === today.toDateString();
    const isYesterday = bookingDate.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) acc.today++;
    if (isYesterday) acc.yesterday++;
    return acc;
  }, { today: 0, yesterday: 0 });

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (current < previous) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Dashboard Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Active Nannies</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboardStats.activeNannies}</div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
              {getTrendIcon(nannyStats.available, nannyStats.approved - nannyStats.available)}
              <span className={getTrendColor(nannyStats.available, nannyStats.approved - nannyStats.available)}>
                {nannyStats.available} available
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboardStats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Registered clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Today's Bookings</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{dashboardStats.todayBookings}</div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
              {getTrendIcon(recentBookingTrend?.today || 0, recentBookingTrend?.yesterday || 0)}
              <span className={getTrendColor(recentBookingTrend?.today || 0, recentBookingTrend?.yesterday || 0)}>
                vs yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(dashboardStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {revenueBreakdown.bookingCount} bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Booking Status</CardTitle>
            <CardDescription>Current booking distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                <span className="text-xs sm:text-sm">Pending</span>
              </div>
              <Badge variant="secondary">{bookingStats.pending}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Confirmed</span>
              </div>
              <Badge variant="default">{bookingStats.confirmed}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Active</span>
              </div>
              <Badge variant="default">{bookingStats.active}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Completed</span>
              </div>
              <Badge variant="outline">{bookingStats.completed}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Revenue Breakdown</CardTitle>
            <CardDescription>Revenue sources analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Placement Fees</span>
              <span className="font-semibold">{formatCurrency(revenueBreakdown.placementFees)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Commission</span>
              <span className="font-semibold">{formatCurrency(revenueBreakdown.commissionRevenue)}</span>
            </div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total Revenue</span>
              <span>{formatCurrency(revenueBreakdown.totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Nanny Overview</CardTitle>
            <CardDescription>Nanny platform statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Approved</span>
              <Badge variant="default">{nannyStats.approved}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Approval</span>
              <Badge variant="secondary">{nannyStats.pending}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Available</span>
              <Badge variant="outline">{nannyStats.available}</Badge>
            </div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Earnings</span>
              <span className="font-semibold">{formatCurrency(nannyStats.totalEarnings)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Alerts */}
      {dashboardStats.supportTickets > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">Support Attention Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-3">
              You have {dashboardStats.supportTickets} open support ticket{dashboardStats.supportTickets !== 1 ? 's' : ''} that need attention.
            </p>
            <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
              View Support Tickets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Admin Actions */}
      {auditTrail && auditTrail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Admin Actions</CardTitle>
            <CardDescription>Latest administrative actions taken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditTrail.slice(0, 5).map((action: any) => (
                <div key={action.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium">
                      {action.action_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      Booking for {action.bookings?.clients?.profiles?.first_name} {action.bookings?.clients?.profiles?.last_name}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {format(new Date(action.performed_at), 'MMM dd, HH:mm')}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium">
                      {action.profiles?.first_name} {action.profiles?.last_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}