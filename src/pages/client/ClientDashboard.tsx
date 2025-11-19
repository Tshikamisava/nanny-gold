import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/components/AuthProvider';
import { useBookings } from '@/hooks/useBookings';
import { useInterviews } from '@/hooks/useInterviews';
import { useProfileCompletion, useClientProfile } from '@/hooks/useClientProfile';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  Star,
  Search,
  UserPlus,
  ArrowRight,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { SmartChatWidget } from '@/components/SmartChatWidget';
import { BookingModificationDialog } from '@/components/BookingModificationDialog';
import { LazyBookingModificationHistory } from '@/components/LazyBookingModificationHistory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientStats {
  totalBookings: number;
  totalSpent: number;
  averageRating: number;
  upcomingBookings: number;
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<ClientStats>({
    totalBookings: 0,
    totalSpent: 0,
    averageRating: 0,
    upcomingBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useBookings();
  const { data: interviews, isLoading: interviewsLoading } = useInterviews();
  
  console.log('ClientDashboard - User ID:', user?.id);
  console.log('ClientDashboard - Bookings count:', bookings?.length || 0);
  console.log('ClientDashboard - Interviews count:', interviews?.length || 0);
  const { isComplete: isProfileComplete, completionPercentage } = useProfileCompletion();
  const { forceRefetch } = useClientProfile();

  // PHASE 4: Force profile refresh on dashboard mount to ensure fresh data
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 ClientDashboard mounted - forcing profile refresh for user:', user.id);
      forceRefetch();
    }
  }, [user?.id, forceRefetch]);

  // Memoize expensive calculations
  const pendingBookings = useMemo(() => 
    bookings?.filter(booking => booking.status === 'pending') || [], 
    [bookings]
  );

  const activeBookings = useMemo(() => 
    bookings?.filter(booking => 
      booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'active'
    ) || [], [bookings]
  );
  
  const completedBookings = useMemo(() => 
    bookings?.filter(booking => 
      booking.status === 'completed'
    ) || [], [bookings]
  );

  const cancelledBookings = useMemo(() => 
    bookings?.filter(booking => booking.status === 'cancelled') || [], 
    [bookings]
  );
  
  const upcomingInterviews = useMemo(() => 
    interviews?.filter(interview => 
      interview.status === 'scheduled' && new Date(interview.interview_date) >= new Date()
    ) || [], [interviews]
  );

  const handleModificationSubmitted = useCallback(() => {
    refetchBookings();
    setRefreshKey(prev => prev + 1);
  }, [refetchBookings]);

  // Phase 5: Real-time subscription for booking updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('client-bookings-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `client_id=eq.${user.id}`
      }, (payload) => {
        console.log('Booking change detected:', payload);
        refetchBookings();
        if (payload.eventType === 'UPDATE') {
          toast({
            title: "Booking Updated",
            description: "Your booking status has changed",
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchBookings]);

  // Fetch invoice data for totalSpent calculation
  useEffect(() => {
    const fetchInvoiceStats = async () => {
      if (!user?.id) return;
      
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status')
        .eq('client_id', user.id)
        .eq('status', 'paid');
      
      const totalSpent = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
      
      if (!bookingsLoading && !interviewsLoading && bookings) {
        setStats({
          totalBookings: bookings.length,
          totalSpent,
          averageRating: 4.8,
          upcomingBookings: activeBookings.length + pendingBookings.length
        });
        setLoading(false);
      }
    };
    
    fetchInvoiceStats();
  }, [bookingsLoading, interviewsLoading, bookings?.length, activeBookings.length, pendingBookings.length, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Determine if user is new (no bookings and no interviews)
  const isNewUser = !bookingsLoading && !interviewsLoading && 
                    bookings?.length === 0 && interviews?.length === 0;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
          {isNewUser ? "Welcome! Let's find your perfect nanny." : "Welcome back! Here's an overview of your childcare activities."}
        </p>
      </div>

      {/* Profile Completion Banner for incomplete profiles */}
      {!isProfileComplete && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your profile to get better nanny matches ({completionPercentage}% complete)
                  </p>
                </div>
                <Progress value={completionPercentage} className="h-2" />
                <Button 
                  size="sm" 
                  onClick={() => navigate('/client/profile-settings')}
                  className="w-full sm:w-auto"
                >
                  Complete Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions for New Users */}
      {isNewUser && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/20 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/service-prompt')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Find Your Perfect Nanny</CardTitle>
                  <CardDescription>Browse available nannies and book care</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/service-prompt')}>
                Start Search
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/interviews')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Schedule Interviews</CardTitle>
                  <CardDescription>Meet nannies before making a decision</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/interviews')}>
                View Interviews
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Active Bookings</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{activeBookings.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Currently ongoing</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Upcoming Interviews</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{upcomingInterviews.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Scheduled this month</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Completed Sessions</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{completedBookings.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Success Rate</CardTitle>
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">100%</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Booking satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Dashboard View */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 gap-0.5">
          <TabsTrigger value="overview" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3">Overview</TabsTrigger>
          <TabsTrigger value="pending" className="relative text-[10px] sm:text-xs md:text-sm px-1 sm:px-3">
            Pending
            {pendingBookings.length > 0 && (
              <Badge variant="destructive" className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[8px] sm:text-xs">
                {pendingBookings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3">Active</TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-3">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Active Bookings</CardTitle>
                <CardDescription className="text-sm">Your confirmed childcare sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeBookings.length === 0 ? (
                    <div className="text-center py-6 md:py-8">
                      <Calendar className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                      <p className="text-sm md:text-base font-medium text-muted-foreground mb-2">No active bookings</p>
                      <p className="text-xs md:text-sm text-muted-foreground mb-4">Find and book your perfect nanny today</p>
                      <Button size="sm" onClick={() => navigate('/service-prompt')} className="w-full sm:w-auto">
                        Find a Nanny
                        <Search className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    activeBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-accent/10 rounded-lg gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm md:text-base truncate">
                                {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Session'}
                              </p>
                              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                                Started {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                R{booking.total_monthly_cost?.toFixed(2)}/month
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                            <Badge variant="secondary" className="text-xs">{booking.status}</Badge>
                            <BookingModificationDialog 
                              booking={booking} 
                              onModificationSubmitted={handleModificationSubmitted}
                            />
                          </div>
                        </div>
                        <LazyBookingModificationHistory key={refreshKey} bookingId={booking.id} />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Booking Management Section */}
            {activeBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Booking Management</CardTitle>
                  <CardDescription className="text-sm">Modify your current bookings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeBookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Session'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.start_date), 'PPP')} - 
                            {booking.end_date ? format(new Date(booking.end_date), 'PPP') : 'Ongoing'}
                          </p>
                          <p className="text-sm font-medium">R{booking.total_monthly_cost?.toFixed(2)}/month</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                          <BookingModificationDialog 
                            booking={booking} 
                            onModificationSubmitted={handleModificationSubmitted}
                          />
                        </div>
                      </div>
                      <LazyBookingModificationHistory key={refreshKey} bookingId={booking.id} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Pending Bookings Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  You don't have any booking requests awaiting nanny response.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => {
                const daysWaiting = Math.floor(
                  (new Date().getTime() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysWaiting > 2;
                
                return (
                  <Card key={booking.id} className={isUrgent ? "border-orange-300 bg-orange-50/30" : ""}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className={`w-5 h-5 ${isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`} />
                            <div>
                              <h3 className="font-semibold text-lg">
                                {booking.booking_type === 'long_term' ? 'Long-term Care Request' : 'Short-term Booking Request'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Requested {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Badge variant={isUrgent ? "destructive" : "secondary"}>
                            {isUrgent ? `${daysWaiting} days waiting` : 'Pending'}
                          </Badge>
                        </div>

                        {/* Booking Details */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Start Date</p>
                            <p className="font-medium">{format(new Date(booking.start_date), 'MMM dd, yyyy')}</p>
                          </div>
                          {booking.end_date && (
                            <div>
                              <p className="text-xs text-muted-foreground">End Date</p>
                              <p className="font-medium">{format(new Date(booking.end_date), 'MMM dd, yyyy')}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Cost</p>
                            <p className="font-medium text-lg">R{booking.total_monthly_cost?.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Nanny Info */}
                        {booking.nannies && (
                          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                            <User className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Requested Nanny</p>
                              <p className="font-medium">
                                {booking.nannies.profiles?.first_name} {booking.nannies.profiles?.last_name}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                          >
                            View Details
                          </Button>
                          {isUrgent && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300"
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Contact Support
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Active Bookings Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeBookings.filter(b => b.status !== 'pending').length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Bookings</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  You don't have any confirmed bookings at the moment.
                </p>
                <Button onClick={() => navigate('/service-prompt')}>
                  Find a Nanny
                  <Search className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeBookings.filter(b => b.status !== 'pending').map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="font-semibold text-lg">
                              {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Booking'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Started {format(new Date(booking.start_date), 'PPP')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="default">{booking.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly Cost</p>
                          <p className="font-medium text-lg">R{booking.total_monthly_cost?.toFixed(2)}</p>
                        </div>
                        {booking.living_arrangement && (
                          <div>
                            <p className="text-xs text-muted-foreground">Arrangement</p>
                            <p className="font-medium capitalize">{booking.living_arrangement.replace('_', ' ')}</p>
                          </div>
                        )}
                      </div>

                      {booking.nannies && (
                        <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                          <User className="w-8 h-8 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Your Nanny</p>
                            <p className="font-medium">
                              {booking.nannies.profiles?.first_name} {booking.nannies.profiles?.last_name}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <BookingModificationDialog 
                          booking={booking} 
                          onModificationSubmitted={handleModificationSubmitted}
                        />
                        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}>
                          View Details
                        </Button>
                      </div>

                      <LazyBookingModificationHistory key={refreshKey} bookingId={booking.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {completedBookings.length === 0 && cancelledBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Your completed and cancelled bookings will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {completedBookings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Completed Bookings</h3>
                    {completedBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="font-medium">
                                  {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Booking'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(booking.start_date), 'MMM dd')} - 
                                  {booking.end_date ? format(new Date(booking.end_date), 'MMM dd, yyyy') : 'Ongoing'}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {cancelledBookings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Cancelled Bookings</h3>
                    {cancelledBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <XCircle className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Booking'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">Cancelled</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Active Bookings</CardTitle>
            <CardDescription className="text-sm">Your confirmed childcare sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeBookings.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <Calendar className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                  <p className="text-sm md:text-base font-medium text-muted-foreground mb-2">No active bookings</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4">Find and book your perfect nanny today</p>
                  <Button size="sm" onClick={() => navigate('/service-prompt')}>
                    Find a Nanny
                    <Search className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                activeBookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">
                            {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Session'}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Started {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            R{booking.total_monthly_cost?.toFixed(2)}/month
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{booking.status}</Badge>
                        <BookingModificationDialog 
                          booking={booking} 
                          onModificationSubmitted={handleModificationSubmitted}
                        />
                      </div>
                    </div>
                    <LazyBookingModificationHistory key={refreshKey} bookingId={booking.id} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking Management Section */}
        {activeBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Booking Management</CardTitle>
              <CardDescription className="text-sm">Modify your current bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Session'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.start_date), 'PPP')} - 
                        {booking.end_date ? format(new Date(booking.end_date), 'PPP') : 'Ongoing'}
                      </p>
                      <p className="text-sm font-medium">R{booking.total_monthly_cost?.toFixed(2)}/month</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                      <BookingModificationDialog 
                        booking={booking} 
                        onModificationSubmitted={handleModificationSubmitted}
                      />
                    </div>
                  </div>
                  
                  {/* Current Services */}
                  {booking.services && Object.keys(booking.services).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Current Services:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(booking.services).map(serviceKey => {
                          const getServiceDisplayName = (key: string) => {
                            if (key === 'special_needs') return 'Diverse Ability Support';
                            return key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                          };
                          
                          return (
                            <Badge key={serviceKey} variant="outline">
                              {getServiceDisplayName(serviceKey)}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <LazyBookingModificationHistory key={`${booking.id}-${refreshKey}`} bookingId={booking.id} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Recent Activity</CardTitle>
            <CardDescription className="text-sm">Quick overview of recent bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeBookings.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <Calendar className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                  <p className="text-sm md:text-base font-medium text-muted-foreground mb-2">No bookings yet</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4">Start your childcare journey</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/service-prompt')}>
                    Browse Nannies
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                activeBookings.slice(0, 2).map((booking) => (
                  <div key={`summary-${booking.id}`} className="flex items-center space-x-3 md:space-x-4 p-2 md:p-3 bg-accent/10 rounded-lg">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">
                        {booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Session'}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        R{booking.total_monthly_cost?.toFixed(2)}/month
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{booking.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Upcoming Interviews</CardTitle>
            <CardDescription className="text-sm">Scheduled nanny interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingInterviews.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <User className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                  <p className="text-sm md:text-base font-medium text-muted-foreground mb-2">No upcoming interviews</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4">Meet nannies before you book</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/interviews')}>
                    Schedule Interview
                    <Calendar className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                upcomingInterviews.slice(0, 3).map((interview) => (
                  <div key={interview.id} className="flex items-center space-x-3 md:space-x-4 p-2 md:p-3 bg-primary/5 rounded-lg">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{interview.nanny_name || 'Nanny Interview'}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {format(new Date(interview.interview_date), 'MMM dd, yyyy')} at {interview.interview_time}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">Scheduled</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SmartChatWidget userType="client" />
    </div>
  );
};