import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, DollarSign, Home, MessageSquare, Clock, User, MapPin, Briefcase } from 'lucide-react';
import { LazyBookingModificationHistory } from '@/components/LazyBookingModificationHistory';
import { BookingRevenueDisplay } from '@/components/BookingRevenueDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useBookingRealtime } from '@/hooks/useBookingRealtime';

export default function ClientBookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  // Enable real-time booking updates
  useBookingRealtime();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      // Query booking with nanny data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          nannies!bookings_nanny_id_fkey (
            id,
            hourly_rate,
            monthly_rate,
            rating,
            bio
          ),
          booking_financials (
            fixed_fee,
            nanny_earnings,
            commission_amount,
            admin_total_revenue
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Query nanny profile separately (since nannies.id === profiles.id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, email, location')
        .eq('id', bookingData.nanny_id)
        .single();

      if (profileError) console.warn('Profile fetch error:', profileError);

      // Query invoice for placement fee due date
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, due_date, invoice_number, status')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...bookingData,
        nanny_profile: profileData,
        invoice: invoiceData,
      };
    },
    enabled: !!bookingId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'confirmed': return 'default';
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Booking not found</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nannyProfile = booking.nanny_profile;
  const financials = booking.booking_financials?.[0];
  const placementFee = financials?.fixed_fee || 0;
  const placementFeeDueDate = booking.invoice?.due_date || booking.created_at;

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Booking Details</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View and manage your booking</p>
        </div>
      </div>

      {/* Status and Quick Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Booking Status</CardTitle>
            <Badge variant={getStatusColor(booking.status)}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(new Date(booking.start_date), 'PPP')}</p>
            </div>
          </div>
          {booking.work_start_time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="font-medium">{booking.work_start_time}</p>
              </div>
            </div>
          )}
          {booking.end_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{format(new Date(booking.end_date), 'PPP')}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="font-medium">R{booking.total_monthly_cost?.toFixed(2)}</p>
            </div>
          </div>
          {booking.booking_type && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Booking Type</p>
                <p className="font-medium capitalize">{booking.booking_type.replace('_', ' ')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nanny Information */}
      {nannyProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Nanny Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {nannyProfile.first_name} {nannyProfile.last_name}
              </p>
            </div>
            {nannyProfile.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{nannyProfile.location}</p>
                </div>
              </div>
            )}
            {nannyProfile.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{nannyProfile.phone}</p>
              </div>
            )}
            {nannyProfile.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{nannyProfile.email}</p>
              </div>
            )}
            {booking.nannies?.rating && (
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="font-medium">⭐ {booking.nannies.rating.toFixed(1)}</p>
              </div>
            )}
            <Button className="w-full sm:w-auto mt-4">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Nanny
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {booking.living_arrangement && (
            <div>
              <p className="text-sm text-muted-foreground">Living Arrangement</p>
              <p className="font-medium capitalize">{booking.living_arrangement.replace('_', ' ')}</p>
            </div>
          )}
          {booking.home_size && (
            <div>
              <p className="text-sm text-muted-foreground">Home Size</p>
              <p className="font-medium capitalize">{booking.home_size.replace('_', ' ')}</p>
            </div>
          )}
          {booking.services && Object.keys(booking.services).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Services Requested</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(booking.services).map(([key, value]) => 
                    value && (
                      <Badge key={key} variant="secondary">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </>
          )}
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-2">Cost Breakdown</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Base Rate</span>
                <span className="font-medium">R{booking.base_rate?.toFixed(2)}</span>
              </div>
              {booking.additional_services_cost > 0 && (
                <div className="flex justify-between">
                  <span>Additional Services</span>
                  <span className="font-medium">R{booking.additional_services_cost?.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>R{booking.total_monthly_cost?.toFixed(2)}</span>
              </div>
            </div>
          </div>
          {booking.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{booking.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Placement Fee */}
      {placementFee > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Placement Fee
            </CardTitle>
            <CardDescription>One-time fee for nanny placement service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Placement Fee Amount</p>
                <p className="text-2xl font-bold">R{placementFee.toFixed(2)}</p>
              </div>
              {booking.invoice && (
                <Badge variant={booking.invoice.status === 'paid' ? 'default' : 'outline'}>
                  {booking.invoice.status === 'paid' ? 'Paid' : 'Pending'}
                </Badge>
              )}
            </div>
            {placementFeeDueDate && (
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{format(new Date(placementFeeDueDate), 'PPP')}</p>
              </div>
            )}
            {booking.invoice?.status !== 'paid' && (
              <Button className="w-full" onClick={() => navigate(`/eft-payment?invoiceId=${booking.invoice?.id}`)}>
                Pay Placement Fee Now
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Breakdown - Transparent Cost Display */}
      {financials && (
        <BookingRevenueDisplay
          bookingType={booking.booking_type as 'short_term' | 'long_term' | 'emergency'}
          totalCost={booking.total_monthly_cost || 0}
          baseRate={booking.base_rate || 0}
          additionalServices={booking.additional_services_cost || 0}
          placementFee={financials.fixed_fee || 0}
          commissionPercent={financials.commission_percent || 0}
          commissionAmount={financials.commission_amount || 0}
          nannyEarnings={financials.nanny_earnings || 0}
          adminRevenue={financials.admin_total_revenue || 0}
          homeSize={booking.home_size}
          userRole="client"
        />
      )}

      {/* Modification History */}
      <Card>
        <CardHeader>
          <CardTitle>Modification History</CardTitle>
          <CardDescription>View all changes made to this booking</CardDescription>
        </CardHeader>
        <CardContent>
          <LazyBookingModificationHistory bookingId={booking.id} />
        </CardContent>
      </Card>

      {/* Actions */}
      {booking.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button variant="outline" className="flex-1">
              Request Changes
            </Button>
            <Button variant="destructive" className="flex-1">
              Cancel Booking
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
