import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/pricingUtils';
import { formatLocation } from '@/utils/locationFormatter';
import { useToast } from '@/hooks/use-toast';
import { BookingWithRelations } from '@/types/booking';
import { useBookingRealtime } from '@/hooks/useBookingRealtime';

type BookingRequest = BookingWithRelations;

export default function NannyBookingsManagement() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  // Enable real-time booking updates for nanny
  useBookingRealtime({
    onBookingInsert: () => loadBookings(),
    onBookingUpdate: () => loadBookings(),
    onBookingDelete: () => loadBookings()
  });
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      loadBookings();
    } else {
      // In development mode, show empty state when no user is available
      setBookings([]);
      setLoading(false);
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          clients(
            id,
            home_size,
            number_of_children,
            children_ages
          ),
          booking_financials(nanny_earnings)
        `)
        .eq('nanny_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bookingsData = (data as unknown as BookingRequest[]) || [];

      // Fetch client profiles in a separate query to avoid schema relationship issues
      const clientIds = Array.from(new Set(bookingsData.map(b => b.client_id).filter(Boolean)));
      let profilesById: Record<string, any> = {};
      if (clientIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone, location')
          .in('id', clientIds);

        if (profilesError) {
          console.error('Error loading client profiles:', profilesError);
        } else {
          profilesById = (profilesData || []).reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const merged = bookingsData.map((b: any) => ({
        ...b,
        profiles: profilesById[b.client_id] || b.profiles
      }));

      console.log('🔍 Nanny Booking Debug:', {
        bookingId: merged[0]?.id,
        hasProfiles: !!merged[0]?.profiles,
        profileData: merged[0]?.profiles,
        hasServices: !!merged[0]?.services,
        servicesData: merged[0]?.services,
        hasClients: !!merged[0]?.clients,
        clientsData: merged[0]?.clients
      });

      setBookings(merged);
    } catch (error: any) {
      console.error('Error loading bookings:', error?.message || error);
      toast({
        title: "Error",
        description: error?.message ? `Failed to load bookings: ${error.message}` : "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'decline') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: action === 'accept' ? 'confirmed' : 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: action === 'accept' ? "Booking Accepted" : "Booking Declined",
        description: `You have ${action === 'accept' ? 'accepted' : 'declined'} the booking request.`
      });

      // Reload bookings
      loadBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'active': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getBookingTypeDisplay = (type: string) => {
    const types = {
      'emergency': { label: 'Emergency', color: 'destructive' },
      'date_night': { label: 'Date Night', color: 'secondary' },
      'date_day': { label: 'Day Care', color: 'outline' },
      'school_holiday': { label: 'School Holiday', color: 'default' },
      'long_term': { label: 'Long Term', color: 'default' },
      'standard': { label: 'Standard', color: 'outline' }
    };
    return types[type as keyof typeof types] || types['standard'];
  };

  const getClientName = (booking: BookingRequest) => {
    const firstFromClients = booking.clients?.profiles?.first_name || '';
    const lastFromClients = booking.clients?.profiles?.last_name || '';
    const firstFromProfile = (booking as any)?.profiles?.first_name || '';
    const lastFromProfile = (booking as any)?.profiles?.last_name || '';

    const first = firstFromClients || firstFromProfile;
    const last = lastFromClients || lastFromProfile;

    const combined = `${first} ${last}`.trim();
    return combined || 'Client';
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'active');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading booking requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Booking Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage your booking requests and confirmed sessions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{pendingBookings.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Confirmed Bookings</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{confirmedBookings.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Upcoming sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed Sessions</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{completedBookings.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Total completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Tabs */}
      <Tabs defaultValue="pending" className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="pending" className="text-xs sm:text-sm py-1.5 sm:py-2">Pending ({pendingBookings.length})</TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs sm:text-sm py-1.5 sm:py-2">Confirmed ({confirmedBookings.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm py-1.5 sm:py-2">Completed ({completedBookings.length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm py-1.5 sm:py-2">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <span>Pending Requests</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((booking) => {
                    const clientName = getClientName(booking);
                    const bookingType = getBookingTypeDisplay(booking.booking_type);
                    /**
                     * Note: booking_financials is returned as an array by Supabase (nested select behavior)
                     * Access the first element for the one-to-one relationship
                     */
                    const expectedEarnings = booking.booking_financials?.[0]?.nanny_earnings || (booking.total_monthly_cost * 0.8);
                    const bookingAny = booking as any;

                    return (
                      <div key={booking.id} className="p-3 sm:p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-semibold text-sm sm:text-base text-gray-900">{clientName}</h4>
                                {(!bookingAny.profiles?.first_name && !bookingAny.profiles?.last_name) && (
                                  <Badge variant="outline" className="border-orange-400 text-orange-600 text-[10px]">
                                    ⏳ Profile Incomplete
                                  </Badge>
                                )}
                              </div>
                              <Badge variant={bookingType.color as any} className="mt-1 text-[10px] sm:text-xs">
                                {bookingType.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="font-semibold text-sm sm:text-base text-green-600">
                              {formatCurrency(expectedEarnings)}
                            </p>
                            <p className="text-xs text-gray-500">Expected earnings</p>
                          </div>
                        </div>

                        {/* Essential Booking Details */}
                        <div className="space-y-2 mb-3 p-2 sm:p-3 bg-white rounded-md border">
                          {/* Address */}
                          {bookingAny.profiles?.location && (
                            <div>
                              <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Location</p>
                              <div className="flex items-start gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm">{formatLocation(bookingAny.profiles.location)}</p>
                              </div>
                            </div>
                          )}

                          {/* Schedule */}
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Schedule</p>
                            <div className="flex items-start gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs sm:text-sm">
                                {format(new Date(booking.start_date), 'EEE, MMM dd, yyyy')}
                                {bookingAny.schedule && typeof bookingAny.schedule === 'object' && (
                                  <span className="ml-1 text-gray-500 text-[10px] sm:text-xs">
                                    ({Object.entries(bookingAny.schedule).filter(([_, v]) => v).map(([k]) => k.slice(0, 3)).join(', ')})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Services/Tasks */}
                          {bookingAny.services && Object.keys(bookingAny.services).length > 0 && (
                            <div>
                              <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Your Responsibilities</p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {Object.entries(bookingAny.services).map(([key, value]) =>
                                  value && (
                                    <Badge key={key} variant="secondary" className="text-[10px]">
                                      {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Children Info */}
                          {booking.clients?.number_of_children > 0 && (
                            <div>
                              <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Children</p>
                              <p className="text-xs sm:text-sm mt-0.5">
                                {booking.clients.number_of_children} child{booking.clients.number_of_children > 1 ? 'ren' : ''}
                                {booking.clients.children_ages && booking.clients.children_ages.length > 0 && (
                                  <span className="text-gray-500 text-[10px] sm:text-xs"> (ages: {booking.clients.children_ages.join(', ')})</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleBookingAction(booking.id, 'accept')}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm py-1.5 sm:py-2"
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleBookingAction(booking.id, 'decline')}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 text-xs sm:text-sm py-1.5 sm:py-2"
                          >
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-3">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span>Confirmed Bookings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {confirmedBookings.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">No confirmed bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {confirmedBookings.map((booking) => {
                    const clientName = getClientName(booking);
                    const bookingType = getBookingTypeDisplay(booking.booking_type);

                    return (
                      <div key={booking.id} className="p-3 sm:p-4 border rounded-lg bg-green-50 border-green-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900">{clientName}</h4>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                              </p>
                              <Badge variant={bookingType.color as any} className="mt-1 text-[10px] sm:text-xs">
                                {bookingType.label}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(booking.status)} className="text-[10px] sm:text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-base sm:text-lg">Completed Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {completedBookings.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">No completed sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedBookings.map((booking) => {
                    const clientName = getClientName(booking);

                    return (
                      <div key={booking.id} className="p-3 sm:p-4 border rounded-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900">{clientName}</h4>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="font-semibold text-sm sm:text-base text-green-600">
                              {formatCurrency(booking.booking_financials?.[0]?.nanny_earnings || 0)}
                            </p>
                            <p className="text-xs text-gray-500">Earned</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-base sm:text-lg">Cancelled Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center py-6">
                <XCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600">No cancelled bookings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}