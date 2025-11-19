import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { Calendar, Clock, DollarSign, MapPin, Check, X } from 'lucide-react';
import { NannyBookingDetailsDialog } from '@/components/nanny/NannyBookingDetailsDialog';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  start_date: string;
  end_date?: string;
  status: string;
  booking_type: string;
  total_monthly_cost: number;
  base_rate: number;
  additional_services_cost: number;
  notes?: string;
  nanny_earnings?: number;
  commission_percent?: number;
  has_financials: boolean;
  client: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
  };
  family_info?: {
    number_of_children: number;
    children_ages: string[];
    other_dependents: number;
    pets_in_home: string;
    home_size: string;
  };
  additional_support?: {
    driving_support: boolean;
    errand_runs: boolean;
    light_house_keeping: boolean;
    cooking: boolean;
    pet_care: boolean;
    special_needs: boolean;
  };
}

// Format location JSON to clean postal address
const formatAddressForDisplay = (location: any): string => {
  if (!location) return '';
  
  try {
    const loc = typeof location === 'string' ? JSON.parse(location) : location;
    const parts = [];
    
    if (loc.street?.trim()) parts.push(loc.street.trim());
    if (loc.estate?.trim()) parts.push(loc.estate.trim());
    if (loc.suburb?.trim()) parts.push(loc.suburb.trim());
    if (loc.city?.trim()) parts.push(loc.city.trim());
    
    const address = parts.join(', ');
    return loc.postal?.trim() ? `${address} ${loc.postal.trim()}` : address;
  } catch (error) {
    return typeof location === 'string' ? location : '';
  }
};

// Get service names from additional_support object
const getServiceBadges = (services: any): string[] => {
  if (!services) return [];
  
  const badges = [];
  if (services.cooking) badges.push('Cooking');
  if (services.special_needs) badges.push('Diverse Ability Support');
  if (services.driving_support) badges.push('Driving');
  if (services.pet_care) badges.push('Pet Care');
  if (services.ecd_training) badges.push('ECD Training');
  if (services.montessori) badges.push('Montessori');
  if (services.backup_nanny) badges.push('Backup Nanny');
  if (services.light_house_keeping) badges.push('Light Housekeeping');
  if (services.errand_runs) badges.push('Errands');
  
  return badges;
};

// Calculate nanny earnings using sliding scale commission
const calculateNannyEarnings = (
  baseRate: number, 
  additionalServices: number, 
  commissionPercent?: number
): number => {
  // Use database commission if available
  if (commissionPercent) {
    const commissionAmount = Math.round(baseRate * commissionPercent / 100);
    return baseRate - commissionAmount + additionalServices;
  }
  
  // Otherwise calculate using sliding scale
  let calculatedCommissionPercent = 10;
  if (baseRate >= 18000) calculatedCommissionPercent = 25;
  else if (baseRate >= 12001) calculatedCommissionPercent = 20;
  else if (baseRate >= 8000) calculatedCommissionPercent = 15;
  
  const commissionAmount = Math.round(baseRate * calculatedCommissionPercent / 100);
  return baseRate - commissionAmount + additionalServices;
};

export default function NannyBookings() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Step 1: Query bookings with financials only (avoids RLS circular dependencies)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, booking_financials(nanny_earnings, commission_percent, commission_amount, admin_total_revenue)')
        .eq('nanny_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        throw bookingsError;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        return;
      }

      // Step 2: Extract unique client IDs
      const clientIds = [...new Set(bookingsData.map(b => b.client_id).filter(Boolean))];

      if (clientIds.length === 0) {
        setBookings([]);
        return;
      }

      // Step 3: Query clients, profiles, and preferences in parallel (no circular RLS)
      const [
        { data: clientsData },
        { data: profilesData },
        { data: preferencesData }
      ] = await Promise.all([
        supabase.from('clients').select('*').in('id', clientIds),
        supabase.from('profiles').select('id, first_name, last_name, email, phone, location').in('id', clientIds),
        supabase.from('client_preferences').select('*').in('client_id', clientIds)
      ]);

      // Step 4: Join data in memory (fast, no database overhead)
      const filteredBookings = bookingsData
        .filter(booking => {
          const services = booking.services as any;
          return !services?.test_data;
        })
        .map(booking => {
          const clientData = clientsData?.find(c => c.id === booking.client_id);
          const clientProfile = profilesData?.find(p => p.id === booking.client_id);
          const clientPreferences = preferencesData?.find(p => p.client_id === booking.client_id);
          const financials = Array.isArray(booking.booking_financials) 
            ? booking.booking_financials[0] 
            : booking.booking_financials;

          return {
            id: booking.id,
            start_date: booking.start_date,
            end_date: booking.end_date,
            status: booking.status,
            booking_type: booking.booking_type,
            total_monthly_cost: booking.total_monthly_cost,
            base_rate: booking.base_rate || 0,
            additional_services_cost: booking.additional_services_cost || 0,
            nanny_earnings: financials?.nanny_earnings,
            commission_percent: financials?.commission_percent,
            has_financials: !!financials,
            notes: booking.notes,
            client: {
              first_name: clientProfile?.first_name || '',
              last_name: clientProfile?.last_name || '',
              email: clientProfile?.email || '',
              phone: clientProfile?.phone || '',
              location: clientProfile?.location || '',
            },
            family_info: {
              number_of_children: clientData?.number_of_children || 0,
              children_ages: clientData?.children_ages || [],
              other_dependents: clientData?.other_dependents || 0,
              pets_in_home: clientData?.pets_in_home || '',
              home_size: clientData?.home_size || '',
            },
            additional_support: {
              driving_support: clientPreferences?.driving_support || false,
              errand_runs: clientPreferences?.errand_runs || false,
              light_house_keeping: clientPreferences?.light_house_keeping || false,
              cooking: clientPreferences?.cooking || false,
              pet_care: clientPreferences?.pet_care || false,
              special_needs: clientPreferences?.special_needs || false,
            }
          };
        });

      setBookings(filteredBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error loading bookings",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;
      
      await loadBookings(); // Refresh the list
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected' })
        .eq('id', bookingId);

      if (error) throw error;
      
      await loadBookings(); // Refresh the list
      toast({ title: "Booking Declined", description: "The booking request has been declined" });
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast({ title: "Error", description: "Failed to decline booking", variant: "destructive" });
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          work_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Notify admin
      const { data: adminUsers } = await supabase
        .from('admins')
        .select('id')
        .limit(1);
      
      if (adminUsers?.[0]) {
        await supabase.from('notifications').insert({
          user_id: adminUsers[0].id,
          title: 'Booking Completed',
          message: `Nanny has marked booking ${bookingId.slice(0, 8)}... as completed`,
          type: 'booking_completed',
          data: { booking_id: bookingId }
        });
      }
      
      await loadBookings();
      toast({ title: "Marked as Completed", description: "Payment processing will begin shortly" });
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({ title: "Error", description: "Failed to mark booking as complete", variant: "destructive" });
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
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const completedBookings = bookings.filter(b => ['completed', 'rejected', 'cancelled'].includes(b.status));

  if (loading) {
    return (
      <div className="p-3 md:p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Booking Management</h2>
        <p className="text-sm sm:text-base md:text-base text-muted-foreground">
          Manage your booking requests and confirmed appointments.
        </p>
      </div>

      <Card>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
            <TabsTrigger value="pending" className="text-xs md:text-sm">
              Pending ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs md:text-sm">
              Confirmed ({confirmedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs md:text-sm">
              History ({completedBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 p-4 m-0">
            {pendingBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No pending booking requests at the moment.
                </p>
              </div>
            ) : (
              pendingBookings.map((booking) => (
                <Card key={booking.id} onClick={() => setSelectedBooking(booking)} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">
                          {booking.booking_type || 'Booking Request'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {booking.client.first_name || booking.client.last_name 
                            ? `From ${booking.client.first_name} ${booking.client.last_name}`.trim()
                            : `Booking ...${booking.id.slice(-8)}`
                          }
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(booking.status)} className="text-xs ml-2">
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">
                          {new Date(booking.start_date).toLocaleDateString()}
                          {booking.end_date && ` - ${new Date(booking.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-600">
                            Your Earnings: R{booking.has_financials && booking.nanny_earnings 
                              ? booking.nanny_earnings.toFixed(2)
                              : calculateNannyEarnings(
                                  booking.base_rate, 
                                  booking.additional_services_cost, 
                                  booking.commission_percent
                                ).toFixed(2)
                            }
                          </div>
                        </div>
                      </div>
                      {formatAddressForDisplay(booking.client.location) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{formatAddressForDisplay(booking.client.location)}</span>
                        </div>
                      )}
                      {booking.family_info && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Family:</span>
                          <span className="text-xs">
                            {booking.family_info.number_of_children} children (ages: {booking.family_info.children_ages.join(', ')})
                            {booking.family_info.other_dependents > 0 && `, ${booking.family_info.other_dependents} other dependents`}
                            {booking.family_info.pets_in_home && `, ${booking.family_info.pets_in_home}`}
                          </span>
                        </div>
                      )}
                      {booking.additional_support && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {booking.additional_support.driving_support && <Badge variant="outline" className="text-xs">Driving</Badge>}
                          {booking.additional_support.errand_runs && <Badge variant="outline" className="text-xs">Errands</Badge>}
                          {booking.additional_support.light_house_keeping && <Badge variant="outline" className="text-xs">Light Housekeeping</Badge>}
                          {booking.additional_support.cooking && <Badge variant="outline" className="text-xs">Cooking</Badge>}
                          {booking.additional_support.pet_care && <Badge variant="outline" className="text-xs">Pet Care</Badge>}
                          {booking.additional_support.special_needs && <Badge variant="outline" className="text-xs">Diverse Ability Support</Badge>}
                        </div>
                      )}
                    </div>
                    
                    {booking.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Special Requirements:</p>
                        <p className="text-sm">{booking.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleAcceptBooking(booking.id)}
                        className="flex items-center gap-2 flex-1 text-xs md:text-sm"
                        size="sm"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleRejectBooking(booking.id)}
                        className="flex items-center gap-2 flex-1 text-xs md:text-sm"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4 p-4 m-0">
            {confirmedBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No confirmed bookings at the moment.
                </p>
              </div>
            ) : (
              confirmedBookings.map((booking) => {
                // Debug logging for button visibility
                const shouldShowButton = booking.status === 'confirmed' && (!booking.end_date || new Date(booking.end_date) < new Date());
                console.log('🔍 Booking render check:', {
                  id: booking.id.slice(0, 8),
                  status: booking.status,
                  end_date: booking.end_date,
                  hasEndDate: !!booking.end_date,
                  isEndDatePast: booking.end_date ? new Date(booking.end_date) < new Date() : null,
                  shouldShowButton
                });
                
                return (
                <Card 
                  key={booking.id} 
                  onClick={() => {
                    console.log('📱 Booking card clicked:', booking.id.slice(0, 8));
                    setSelectedBooking(booking);
                  }} 
                  className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">
                          {booking.booking_type || 'Confirmed Booking'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {booking.client?.first_name || booking.client?.last_name 
                            ? `With ${booking.client.first_name} ${booking.client.last_name}`.trim()
                            : `Booking ...${booking.id.slice(-8)}`
                          }
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(booking.status)} className="text-xs ml-2">
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">
                          {new Date(booking.start_date).toLocaleDateString()}
                          {booking.end_date && ` - ${new Date(booking.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-600">
                            Your Earnings: R{(
                              booking.nanny_earnings || 
                              calculateNannyEarnings(
                                booking.base_rate, 
                                booking.additional_services_cost, 
                                booking.commission_percent
                              )
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      {formatAddressForDisplay(booking.client?.location) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{formatAddressForDisplay(booking.client.location)}</span>
                        </div>
                      )}
                      {booking.additional_support && getServiceBadges(booking.additional_support).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getServiceBadges(booking.additional_support).map(service => (
                            <Badge key={service} variant="outline" className="text-xs">{service}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {shouldShowButton && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkCompleted(booking.id);
                        }}
                        className="w-full mt-4"
                        variant="default"
                      >
                        Mark as Completed
                      </Button>
                    )}
                  </CardContent>
                </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 p-4 m-0">
            {completedBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No booking history yet.
                </p>
              </div>
            ) : (
              completedBookings.map((booking) => (
                <Card 
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">
                          {booking.booking_type || 'Past Booking'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {booking.client.first_name || booking.client.last_name 
                            ? `With ${booking.client.first_name} ${booking.client.last_name}`.trim()
                            : `Booking ...${booking.id.slice(-8)}`
                          }
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(booking.status)} className="text-xs ml-2">
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">
                          {new Date(booking.start_date).toLocaleDateString()}
                          {booking.end_date && ` - ${new Date(booking.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-600">
                            Earned: R{(
                              booking.nanny_earnings || 
                              calculateNannyEarnings(
                                booking.base_rate, 
                                booking.additional_services_cost, 
                                booking.commission_percent
                              )
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      {formatAddressForDisplay(booking.client?.location) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{formatAddressForDisplay(booking.client.location)}</span>
                        </div>
                      )}
                      {booking.additional_support && getServiceBadges(booking.additional_support).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getServiceBadges(booking.additional_support).map(service => (
                            <Badge key={service} variant="outline" className="text-xs">{service}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
      
      <NannyBookingDetailsDialog
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}