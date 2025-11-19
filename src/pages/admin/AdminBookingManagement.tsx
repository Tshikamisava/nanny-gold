import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Edit,
  MessageCircle,
  FileText,
  Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/pricingUtils';
import { AdminBookingReassignment } from '@/components/AdminBookingReassignment';
import { BookingDetailsDialog } from '@/components/BookingDetailsDialog';
import { BookingWithRelations } from '@/types/booking';

type BookingData = BookingWithRelations;

export default function AdminBookingManagement() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [searchQuery, bookings]);

  const loadBookings = async () => {
    try {
      // First, get bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          clients!inner(
            number_of_children,
            other_dependents,
            home_size,
            profiles!inner(first_name, last_name, email, phone, location)
          ),
          nannies!inner(
            profiles!inner(first_name, last_name)
          ),
          booking_financials!left(
            admin_total_revenue,
            nanny_earnings,
            commission_amount,
            commission_percent,
            fixed_fee,
            booking_type
          )
        `)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Then, get payment proofs for these bookings
      if (bookingsData && bookingsData.length > 0) {
        const bookingIds = bookingsData.map(b => b.id);
        const { data: proofsData } = await supabase
          .from('payment_proofs')
          .select('*')
          .in('booking_id', bookingIds);

        // Attach payment proofs to bookings
        const bookingsWithProofs = bookingsData.map(booking => ({
          ...booking,
          payment_proofs: proofsData?.filter(proof => proof.booking_id === booking.id) || []
        }));

        setBookings(bookingsWithProofs as unknown as BookingData[]);
      } else {
        setBookings((bookingsData as unknown as BookingData[]) || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = bookings.filter(booking => 
      booking.clients.profiles.first_name?.toLowerCase().includes(query) ||
      booking.clients.profiles.last_name?.toLowerCase().includes(query) ||
      booking.clients.profiles.email?.toLowerCase().includes(query) ||
      booking.nannies.profiles.first_name?.toLowerCase().includes(query) ||
      booking.nannies.profiles.last_name?.toLowerCase().includes(query) ||
      booking.booking_type?.toLowerCase().includes(query)
    );
    setFilteredBookings(filtered);
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

  const handleReassignNanny = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setShowReassignDialog(true);
    }
  };

  const handleViewDetails = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setShowDetailsDialog(true);
    }
  };

  const handleMessageClient = async (booking: BookingData) => {
    if (!user?.id) return;
    
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_chat_room', {
        participant1_id: user.id,
        participant2_id: booking.client_id,
        room_type: 'admin_client'
      });

      if (error) throw error;

      toast({
        title: "Chat Room Created",
        description: `Chat room created with ${booking.clients.profiles.first_name} ${booking.clients.profiles.last_name}`,
      });
      
      // In a real implementation, you'd navigate to the chat room
      // For now, just show success message
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast({
        title: "Error",
        description: "Failed to create chat room",
        variant: "destructive"
      });
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('accept_booking_on_behalf', {
        p_booking_id: bookingId,
        p_admin_id: user.id,
        p_reason: 'Admin approval to expedite booking process'
      });

      if (error) throw error;

      toast({
        title: "Booking Accepted",
        description: "Booking has been successfully confirmed on behalf of the nanny.",
      });

      loadBookings(); // Reload data
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast({
        title: "Error",
        description: "Failed to accept booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "The booking has been successfully cancelled.",
      });

      loadBookings(); // Reload data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      });
    }
  };

  // Phase 4: Manual invoice generation for admins
  const handleGenerateInvoice = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-booking-invoice', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;

      toast({
        title: "Invoice Generated",
        description: "Invoice has been successfully created for this booking.",
      });

      loadBookings(); // Reload data
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  /**
   * Note: booking_financials is returned as an array by Supabase even though it's a one-to-one relationship
   * This is standard behavior for nested selects in Supabase
   */
  const totalRevenue = bookings
    .filter(b => ['confirmed', 'active', 'completed'].includes(b.status))
    .reduce((sum, booking) => 
      sum + (booking.booking_financials?.[0]?.admin_total_revenue || 0), 0
    );

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'active');
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <Calendar className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Booking Management</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor and manage all platform bookings
          </p>
        </div>
        <Button onClick={loadBookings}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Active Bookings</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{activeBookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Pending Requests</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{pendingBookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by client, nanny, or booking type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bookings Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap sm:inline-flex gap-1">
          <TabsTrigger value="all" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">Pending ({pendingBookings.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">Active ({activeBookings.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">Completed ({completedBookings.length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">Cancelled ({cancelledBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
            <BookingsList 
              bookings={filteredBookings} 
              onReassign={handleReassignNanny}
              onCancel={handleCancelBooking}
              onViewDetails={handleViewDetails}
              onMessageClient={handleMessageClient}
              onAcceptBooking={handleAcceptBooking}
              onGenerateInvoice={handleGenerateInvoice}
              toast={toast}
            />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingsList 
                bookings={pendingBookings} 
                onReassign={handleReassignNanny}
                onCancel={handleCancelBooking}
                onViewDetails={handleViewDetails}
                onMessageClient={handleMessageClient}
                onAcceptBooking={handleAcceptBooking}
                onGenerateInvoice={handleGenerateInvoice}
                toast={toast}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingsList 
                bookings={activeBookings} 
                onReassign={handleReassignNanny}
                onCancel={handleCancelBooking}
                onViewDetails={handleViewDetails}
                onMessageClient={handleMessageClient}
                onAcceptBooking={handleAcceptBooking}
                onGenerateInvoice={handleGenerateInvoice}
                toast={toast}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingsList 
                bookings={completedBookings} 
                onReassign={handleReassignNanny}
                onCancel={handleCancelBooking}
                onViewDetails={handleViewDetails}
                onMessageClient={handleMessageClient}
                onAcceptBooking={handleAcceptBooking}
                onGenerateInvoice={handleGenerateInvoice}
                toast={toast}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingsList 
                bookings={cancelledBookings} 
                onReassign={handleReassignNanny}
                onCancel={handleCancelBooking}
                onViewDetails={handleViewDetails}
                onMessageClient={handleMessageClient}
                onAcceptBooking={handleAcceptBooking}
                onGenerateInvoice={handleGenerateInvoice}
                toast={toast}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AdminBookingReassignment 
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
      />
      
      <BookingDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog} 
        booking={selectedBooking}
      />
    </div>
  );
}

interface BookingsListProps {
  bookings: BookingData[];
  onReassign: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
  onViewDetails: (bookingId: string) => void;
  onMessageClient: (booking: BookingData) => void;
  onAcceptBooking: (bookingId: string) => void;
  onGenerateInvoice: (bookingId: string) => void;
  toast?: any;
}

function BookingsList({ bookings, onReassign, onCancel, onViewDetails, onMessageClient, onAcceptBooking, onGenerateInvoice, toast = () => {} }: BookingsListProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No bookings found</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const clientName = `${booking.clients.profiles.first_name || ''} ${booking.clients.profiles.last_name || ''}`.trim();
        const nannyName = `${booking.nannies.profiles.first_name || ''} ${booking.nannies.profiles.last_name || ''}`.trim();
        const bookingType = getBookingTypeDisplay(booking.booking_type);

        return (
          <div key={booking.id} className="p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{clientName}</h4>
                  <p className="text-sm text-gray-600">with {nannyName}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={bookingType.color as any}>
                      {bookingType.label}
                    </Badge>
                    <Badge variant={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                    {booking.payment_proofs && booking.payment_proofs.length > 0 && 
                     booking.payment_proofs[0].verification_status === 'pending' && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Payment Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  Client Pays: {formatCurrency(booking.total_monthly_cost)}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-green-600 flex items-center justify-end gap-1 cursor-help">
                        Admin Revenue: {formatCurrency(booking.booking_financials?.[0]?.admin_total_revenue || 0)}
                        <Info className="w-3 h-3" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-xs space-y-2">
                        <div className="font-semibold border-b pb-1">Revenue Breakdown</div>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Placement Fee:</span>
                            <span className="font-medium">{formatCurrency(booking.booking_financials?.[0]?.fixed_fee || 0)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Commission ({booking.booking_financials?.[0]?.commission_percent || 0}%):</span>
                            <span className="font-medium">{formatCurrency(booking.booking_financials?.[0]?.commission_amount || 0)}</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t font-semibold">
                            <span>Total Admin Revenue:</span>
                            <span className="text-green-600">{formatCurrency(booking.booking_financials?.[0]?.admin_total_revenue || 0)}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Nanny Earnings:</span>
                            <span className="font-medium text-blue-600">{formatCurrency(booking.booking_financials?.[0]?.nanny_earnings || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-600">Start Date</p>
                <p className="font-medium">{format(new Date(booking.start_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-medium">{format(new Date(booking.created_at), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-gray-600">Client Email</p>
                <p className="font-medium">{booking.clients.profiles.email}</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onViewDetails(booking.id)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onMessageClient(booking)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Message Client
              </Button>
              {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                <>
                  {booking.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => onAcceptBooking(booking.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept Booking
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onGenerateInvoice(booking.id)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Generate Invoice
                      </Button>
                    </>
                  )}
                  {(booking.status === 'confirmed' || booking.status === 'active') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onGenerateInvoice(booking.id)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Generate Invoice
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onReassign(booking.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reassign
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => onCancel(booking.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}