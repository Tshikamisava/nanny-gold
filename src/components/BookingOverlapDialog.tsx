import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Phone, Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BookingOverlapDialogProps {
  open: boolean;
  onClose: () => void;
  existingBooking: {
    id: string;
    start_date: string;
    end_date?: string;
    booking_type: string;
    status: string;
  };
  nannyName?: string;
}

export const BookingOverlapDialog: React.FC<BookingOverlapDialogProps> = ({
  open,
  onClose,
  existingBooking,
  nannyName
}) => {
  const navigate = useNavigate();

  const handleContactAdmin = () => {
    // Navigate to support center
    navigate('/support');
    onClose();
  };

  const handleOpenChat = () => {
    // Navigate to support center with chat open
    navigate('/support');
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getBookingTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      'long_term': 'Long-term Care',
      'emergency': 'Emergency',
      'date_night': 'Date Night',
      'date_day': 'Day Care',
      'school_holiday': 'School Holiday',
      'standard': 'Gap Coverage',
      'temporary_support': 'Gap Coverage'
    };
    return types[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Booking Overlap Detected
          </DialogTitle>
          <DialogDescription>
            You have an existing booking with {nannyName || 'this nanny'} that overlaps with your selected dates.
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-blue-900 mb-2">
                Good news! You can keep the same nanny for both services.
              </p>
              <p className="text-sm text-blue-800">
                Our team can help you coordinate overlapping bookings with the same nanny. 
                Contact us and we'll arrange this for you.
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Existing Booking:</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Type:</span> {getBookingTypeDisplay(existingBooking.booking_type)}</p>
                <p><span className="font-medium">Status:</span> {existingBooking.status}</p>
                <p><span className="font-medium">Start Date:</span> {formatDate(existingBooking.start_date)}</p>
                {existingBooking.end_date && (
                  <p><span className="font-medium">End Date:</span> {formatDate(existingBooking.end_date)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button
            onClick={handleContactAdmin}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Admin Support
          </Button>
          
          <Button
            onClick={handleOpenChat}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10"
          >
            <Phone className="w-4 h-4 mr-2" />
            Open Live Chat
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          <p>Our support team will help you coordinate both bookings with the same nanny.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
