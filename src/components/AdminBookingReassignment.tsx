import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Star, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNannies } from '@/hooks/useNannies';

interface AdminBookingReassignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Booking {
  id: string;
  client_id: string;
  nanny_id: string;
  start_date: string;
  end_date: string;
  booking_type: string;
  total_monthly_cost: number;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
  nannies: {
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export const AdminBookingReassignment: React.FC<AdminBookingReassignmentProps> = ({
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const { data: nannies = [] } = useNannies();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedNewNanny, setSelectedNewNanny] = useState<string>('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const availableNannies = nannies.filter(nanny => 
    nanny.approval_status === 'approved' && 
    nanny.can_receive_bookings &&
    nanny.id !== selectedBooking?.nanny_id
  );

  const searchBookings = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Use the new improved search function
      const { data, error } = await supabase.rpc('search_bookings_for_reassignment', {
        p_search_term: searchTerm
      });

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = (data || []).map((booking: any) => ({
        id: booking.booking_id,
        client_id: booking.client_id,
        nanny_id: booking.nanny_id,
        start_date: booking.start_date,
        end_date: null, // Will be fetched if needed
        booking_type: booking.booking_type,
        total_monthly_cost: booking.total_cost,
        status: booking.status,
        profiles: {
          first_name: booking.client_name.split(' ')[0],
          last_name: booking.client_name.split(' ').slice(1).join(' ')
        },
        nannies: {
          profiles: {
            first_name: booking.nanny_name.split(' ')[0],
            last_name: booking.nanny_name.split(' ').slice(1).join(' ')
          }
        }
      }));

      setBookings(transformedData);
    } catch (error) {
      console.error('Error searching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to search bookings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReassignBooking = async () => {
    if (!selectedBooking || !selectedNewNanny) return;

    try {
      // Create booking reassignment record
      const { error: reassignmentError } = await supabase
        .from('booking_reassignments')
        .insert({
          original_booking_id: selectedBooking.id,
          original_nanny_id: selectedBooking.nanny_id,
          new_nanny_id: selectedNewNanny,
          client_id: selectedBooking.client_id,
          reassignment_reason: 'admin_initiated',
          client_response: 'pending'
        });

      if (reassignmentError) throw reassignmentError;

      // Update the booking with new nanny
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          nanny_id: selectedNewNanny,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBooking.id);

      if (bookingError) throw bookingError;

      // Create notification for client
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedBooking.client_id,
          title: 'Booking Reassigned',
          message: 'Your booking has been reassigned to a new nanny by our admin team.',
          type: 'booking_reassignment',
          data: {
            booking_id: selectedBooking.id,
            old_nanny_id: selectedBooking.nanny_id,
            new_nanny_id: selectedNewNanny
          }
        });

      if (notificationError) throw notificationError;

      toast({
        title: 'Success',
        description: 'Booking has been successfully reassigned',
      });

      // Reset form
      setSelectedBooking(null);
      setSelectedNewNanny('');
      setSearchTerm('');
      setBookings([]);
      onOpenChange(false);

    } catch (error) {
      console.error('Error reassigning booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to reassign booking',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin Booking Reassignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Bookings */}
          <div className="space-y-4">
            <div>
              <Label>Search Booking</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Search by client name, nanny name, or booking ID
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter client name, nanny name, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchBookings()}
                />
                <Button onClick={searchBookings} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Booking Results */}
            {bookings.length > 0 && (
              <div className="space-y-2">
                <Label>Select Booking to Reassign</Label>
                {bookings.map((booking) => (
                  <Card 
                    key={booking.id}
                    className={`cursor-pointer transition-all ${
                      selectedBooking?.id === booking.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">
                            {booking.profiles?.first_name} {booking.profiles?.last_name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Current Nanny: {booking.nannies?.profiles?.first_name} {booking.nannies?.profiles?.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{booking.booking_type}</Badge>
                          <p className="text-sm font-semibold">R{booking.total_monthly_cost}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(booking.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>ID: {booking.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Select New Nanny */}
          {selectedBooking && (
            <div className="space-y-4">
              <Label>Select New Nanny</Label>
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {availableNannies.map((nanny) => (
                  <Card 
                    key={nanny.id}
                    className={`cursor-pointer transition-all ${
                      selectedNewNanny === nanny.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedNewNanny(nanny.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">
                              {nanny.profiles?.first_name || 'Unknown'} {nanny.profiles?.last_name || 'Nanny'}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 fill-current text-yellow-400" />
                              <span>{nanny.rating || 5.0}</span>
                              <span>•</span>
                              <span>{nanny.experience_level} years</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            R{selectedBooking.booking_type === 'short_term' 
                              ? nanny.hourly_rate + '/hr' 
                              : nanny.monthly_rate + '/month'
                            }
                          </p>
                          {nanny.is_available && (
                            <Badge variant="secondary" className="text-xs">Available</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReassignBooking}
              disabled={!selectedBooking || !selectedNewNanny}
            >
              Reassign Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};