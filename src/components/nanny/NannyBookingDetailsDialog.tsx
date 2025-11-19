import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Phone, 
  Mail,
  Home,
  Users,
  Baby,
  CheckCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/utils/pricingUtils';
import { getHomeSizeDisplayName } from '@/utils/homeSizeDisplay';

interface NannyBookingDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  booking: any;
}

// Helper function to format location as a full address
const formatLocationAddress = (location: any): string => {
  if (!location) return 'Not specified';
  
  try {
    const loc = typeof location === 'string' ? JSON.parse(location) : location;
    const parts = [
      loc.street,
      loc.estate && `Estate: ${loc.estate}`,
      loc.suburb,
      loc.city,
      loc.province?.toUpperCase(),
      loc.postalCode || loc.postal_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Not specified';
  } catch {
    return typeof location === 'string' ? location : 'Not specified';
  }
};

// Helper function to format long-term schedule
const formatLongTermSchedule = (schedule: any) => {
  if (!schedule) return [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.map(day => ({
    day: day.charAt(0).toUpperCase() + day.slice(1),
    active: schedule[day] === true
  }));
};

export const NannyBookingDetailsDialog: React.FC<NannyBookingDetailsDialogProps> = ({
  open,
  onClose,
  booking
}) => {
  if (!booking) return null;

  const clientName = booking?.client 
    ? `${booking.client.first_name || ''} ${booking.client.last_name || ''}`.trim() 
    : 'Unknown Client';
  const clientEmail = booking?.client?.email || 'Not provided';
  const clientPhone = booking?.client?.phone || 'Not provided';
  const clientLocation = booking?.client?.location || '';
  const numberOfChildren = booking.family_info?.number_of_children || 0;
  const childrenAges = booking.family_info?.children_ages || [];
  const otherDependents = booking.family_info?.other_dependents || 0;
  const homeSize = booking.family_info?.home_size;
  const petsInHome = booking.family_info?.pets_in_home;

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
      'temporary_support': { label: 'Temporary Support', color: 'default' },
      'long_term': { label: 'Long Term', color: 'default' },
      'standard': { label: 'Standard', color: 'outline' }
    };
    return types[type as keyof typeof types] || types['standard'];
  };

  const bookingType = getBookingTypeDisplay(booking.booking_type);
  const isLongTerm = booking.booking_type === 'long_term';
  const longTermSchedule = isLongTerm ? formatLongTermSchedule(null) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Booking Details - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={bookingType.color as any}>
              {bookingType.label}
            </Badge>
            <Badge variant={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              ID: {booking.id.slice(0, 8)}...
            </span>
          </div>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{clientName}</span>
              </div>
              {clientEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm break-all">{clientEmail}</span>
                </div>
              )}
              {clientPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{clientPhone}</span>
                </div>
              )}
              {clientLocation && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{formatLocationAddress(clientLocation)}</span>
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Baby className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">{numberOfChildren}</span> {numberOfChildren === 1 ? 'child' : 'children'}
                    {childrenAges.length > 0 && ` (ages: ${childrenAges.join(', ')})`}
                    {otherDependents > 0 && (
                      <>, <span className="font-medium">{otherDependents}</span> other {otherDependents === 1 ? 'occupant' : 'occupants'}</>
                    )}
                  </span>
                </div>
                {homeSize && (
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{getHomeSizeDisplayName(homeSize)}</span>
                  </div>
                )}
                {petsInHome && petsInHome !== 'none' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🐾 Pets: {petsInHome}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Booking Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(parseISO(booking.start_date), 'MMM dd, yyyy')}</p>
                </div>
                {booking.end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{format(parseISO(booking.end_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{isLongTerm ? 'Long-term' : 'Short-term'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services & Support */}
          {booking.additional_support && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Additional Services Requested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {booking.additional_support.driving_support && <Badge variant="outline">Driving Support</Badge>}
                  {booking.additional_support.errand_runs && <Badge variant="outline">Errand Runs</Badge>}
                  {booking.additional_support.light_house_keeping && <Badge variant="outline">Light Housekeeping</Badge>}
                  {booking.additional_support.cooking && <Badge variant="outline">Cooking</Badge>}
                  {booking.additional_support.pet_care && <Badge variant="outline">Pet Care</Badge>}
                  {booking.additional_support.special_needs && <Badge variant="outline">Diverse Ability Support</Badge>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Base Rate</span>
                <span className="font-medium">{formatCurrency(booking.base_rate)}</span>
              </div>
              {booking.additional_services_cost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Additional Services</span>
                  <span className="font-medium">{formatCurrency(booking.additional_services_cost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Your Earnings</span>
                <span className="text-lg font-bold text-green-600">
                  {booking.has_financials && booking.nanny_earnings 
                    ? formatCurrency(booking.nanny_earnings)
                    : 'Calculating...'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Special Requirements */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Special Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
