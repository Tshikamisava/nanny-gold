import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { Calendar, Coins, Star, Clock, MapPin, Users } from 'lucide-react';
import { SmartChatWidget } from '@/components/SmartChatWidget';
import { useToast } from '@/hooks/use-toast';
import { BookingRevenueDisplay } from '@/components/BookingRevenueDisplay';

interface NannyStats {
  totalBookings: number;
  totalEarnings: number;
  averageRating: number;
  pendingBookings: number;
}

export default function NannyDashboard() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<NannyStats>({
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    pendingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup realtime subscription for bookings
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('nanny-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `nanny_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          // Reload data when bookings change
          loadNannyStats();
          loadRecentBookings();
          
          // Show notification for new bookings
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Booking Request",
              description: "You have a new booking request to review.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadNannyStats();
      loadRecentBookings();
    } else {
      // In development mode, show empty state when no user is available
      setStats({
        totalBookings: 0,
        totalEarnings: 0,
        averageRating: 0,
        pendingBookings: 0,
      });
      setRecentBookings([]);
      setLoading(false);
    }
  }, [user]);

  const loadNannyStats = async () => {
    if (!user) return;

    try {
      // Get total bookings (excluding test data)
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('nanny_id', user.id);
      
      // Filter out test bookings client-side
      const realBookings = allBookings?.filter(booking => {
        const services = booking.services as any;
        return !services?.test_data;
      }) || [];
      
      const totalBookings = realBookings.length;

      // Get pending bookings - filter out test data
      const { data: allPendingBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('nanny_id', user.id)
        .eq('status', 'pending');
      
      // Filter out test bookings client-side (consistent with total bookings)
      const realPendingBookings = allPendingBookings?.filter(booking => {
        const services = booking.services as any;
        return !services?.test_data;
      }) || [];
      
      const pendingBookings = realPendingBookings.length;
      console.log('📊 Pending Bookings - Raw:', allPendingBookings?.length, 'After filter:', pendingBookings);

      // Get total earnings from nanny_earnings in booking_financials
      const { data: earningsData, error: earningsError } = await supabase
        .from('booking_financials')
        .select(`
          nanny_earnings,
          booking_id,
          bookings!inner(nanny_id, status)
        `)
        .eq('bookings.nanny_id', user.id)
        .in('bookings.status', ['pending', 'confirmed', 'active', 'completed']);

      console.log('💰 Earnings Debug:', {
        totalBookings: realBookings.length,
        earningsRecords: earningsData?.length,
        earningsData: earningsData,
        error: earningsError
      });

      const totalEarnings = earningsData?.reduce((sum, financial) => sum + (financial.nanny_earnings || 0), 0) || 0;
      console.log('💵 Calculated Total Earnings: R', totalEarnings.toFixed(2));

      // Get rating from nanny profile
      const { data: nannyData } = await supabase
        .from('nannies')
        .select('rating')
        .eq('id', user.id)
        .single();

      setStats({
        totalBookings: totalBookings || 0,
        totalEarnings,
        averageRating: nannyData?.rating || 0,
        pendingBookings: pendingBookings || 0,
      });
    } catch (error) {
      console.error('Error loading nanny stats:', error);
    }
  };

  const loadRecentBookings = async () => {
    if (!user) return;

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_financials(nanny_earnings),
          profiles!client_id(first_name, last_name, location),
          clients(
            id,
            home_size,
            number_of_children,
            children_ages
          )
        `)
        .eq('nanny_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Filter out test bookings
      const filteredBookings = bookings?.filter(booking => {
        const services = booking.services as any;
        return !services?.test_data;
      }).slice(0, 5) || [];

      if (error) {
        console.error('Error loading recent bookings:', error);
        setRecentBookings([]);
        return;
      }

      setRecentBookings(filteredBookings);
    } catch (error) {
      console.error('Error loading recent bookings:', error);
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Welcome Back!</h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
          Here's an overview of your nanny activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-lg md:text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All time bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Your Net Earnings</CardTitle>
            <Coins className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-green-600">R{stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              After platform commission (10-25%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Client satisfaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Recent Booking Activity</CardTitle>
          <CardDescription className="text-sm">
            Your latest booking requests and confirmations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                No recent booking activity
              </p>
            ) : (
              recentBookings.map((booking) => {
                /**
                 * Note: booking_financials is returned as an array by Supabase (nested select behavior)
                 * Access the first element for the one-to-one relationship
                 */
                const nannyEarnings = booking.booking_financials?.[0]?.nanny_earnings;
                const hasFinancials = !!nannyEarnings;
                // Fix client name display with proper join
                const clientFirstName = booking.profiles?.first_name;
                const clientLastName = booking.profiles?.last_name;
                const clientName = (clientFirstName && clientLastName)
                  ? `${clientFirstName} ${clientLastName}`.trim()
                  : clientFirstName || clientLastName || 'Client (Profile Pending)';
                const location = booking.profiles?.location || 'Location not set';
                const livingArrangement = booking.living_arrangement ? 
                  (booking.living_arrangement === 'live-in' ? 'Live-in' : 'Live-out') : '';
                const bookingTypeDisplay = booking.booking_type === 'long_term' ? 'Long-term' : 
                  booking.booking_type === 'emergency' ? 'Emergency' : booking.booking_type || 'Booking';
                const homeSize = booking.clients?.home_size || booking.home_size || 'Not specified';
                const childrenCount = booking.clients?.number_of_children;
                const childrenAges = booking.clients?.children_ages;
                
                return (
                  <div key={booking.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {bookingTypeDisplay} {livingArrangement && `(${livingArrangement})`}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            Client: {clientName}
                          </p>
                          {!booking.profiles && (
                            <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                              ⏳ Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {location}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.start_date).toLocaleDateString()}
                          {booking.end_date && ` - ${new Date(booking.end_date).toLocaleDateString()}`}
                        </p>
                        {childrenCount && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
                            {childrenAges?.length > 0 && 
                              ` (ages: ${childrenAges.join(', ')})`
                            }
                          </div>
                        )}
                        {homeSize !== 'Not specified' && (
                          <p className="text-xs text-muted-foreground">
                            Home: {homeSize}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusColor(booking.status)} className="ml-2 text-xs">
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Your earnings:</p>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {hasFinancials ? `R${nannyEarnings.toFixed(2)}` : 'Calculating...'}
                        </p>
                        {!hasFinancials && (
                          <p className="text-xs text-muted-foreground">Pending calculation</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Revenue Transparency Display */}
                    {hasFinancials && (
                      <div className="mt-3">
                        <BookingRevenueDisplay
                          bookingType={booking.booking_type}
                          totalCost={booking.booking_financials[0]?.total_cost}
                          baseRate={booking.base_rate}
                          additionalServices={booking.additional_services_cost}
                          placementFee={booking.booking_financials[0]?.placement_fee}
                          commissionPercent={booking.booking_financials[0]?.commission_rate}
                          commissionAmount={booking.booking_financials[0]?.commission_amount}
                          nannyEarnings={nannyEarnings}
                          adminRevenue={booking.booking_financials[0]?.admin_revenue}
                          homeSize={homeSize}
                          userRole="nanny"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <Button variant="default" onClick={() => navigate('/nanny/bookings')} className="text-xs md:text-sm">
              View Pending Requests
            </Button>
            <Button variant="outline" onClick={() => navigate('/nanny/messages')} className="text-xs md:text-sm">
              Messages
            </Button>
            <Button variant="outline" onClick={() => navigate('/nanny/calendar')} className="text-xs md:text-sm">
              Update Availability
            </Button>
            <Button variant="outline" onClick={() => navigate('/nanny/profile')} className="text-xs md:text-sm">
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}