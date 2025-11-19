import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, User, Clock, MapPin } from 'lucide-react';
import { useRespondToReassignment } from '@/hooks/useBookingReassignments';
import { useToast } from '@/hooks/use-toast';

interface BookingReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reassignment: {
    id: string;
    new_nanny_id: string;
    alternative_nannies: Array<{
      id: string;
      name: string;
      rating: number;
      hourly_rate: number;
      monthly_rate: number;
      experience_level: string;
    }>;
    bookings: {
      booking_type: string;
      start_date: string;
      nannies: {
        profiles: {
          first_name: string;
          last_name: string;
        };
      };
    };
  };
}

export const BookingReassignmentDialog: React.FC<BookingReassignmentDialogProps> = ({
  open,
  onOpenChange,
  reassignment
}) => {
  const { toast } = useToast();
  const respondToReassignment = useRespondToReassignment();
  const [selectedNannyId, setSelectedNannyId] = React.useState(reassignment.new_nanny_id);

  const handleAccept = async () => {
    try {
      await respondToReassignment.mutateAsync({
        reassignmentId: reassignment.id,
        response: 'accepted',
        selectedNannyId
      });
      
      toast({
        title: 'Reassignment Accepted',
        description: 'Your booking has been confirmed with the selected nanny.',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept reassignment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    try {
      await respondToReassignment.mutateAsync({
        reassignmentId: reassignment.id,
        response: 'rejected'
      });
      
      toast({
        title: 'Reassignment Rejected',
        description: 'Our admin team will help find you a suitable nanny.',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject reassignment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const allNannies = [
    {
      id: reassignment.new_nanny_id,
      name: `${reassignment.bookings?.nannies?.profiles?.first_name || 'Unknown'} ${reassignment.bookings?.nannies?.profiles?.last_name || 'Nanny'}`,
      rating: 4.8,
      hourly_rate: 150,
      monthly_rate: 6000,
      experience_level: '1-3'
    },
    ...(reassignment.alternative_nannies || [])
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Reassignment Required</DialogTitle>
          <p className="text-muted-foreground">
            Your original nanny is no longer available. We've found excellent alternatives for you.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Available Nannies</h3>
            
            {allNannies.map((nanny) => (
              <Card 
                key={nanny.id}
                className={`cursor-pointer transition-all ${
                  selectedNannyId === nanny.id 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedNannyId(nanny.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{nanny.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Star className="w-4 h-4 fill-current text-yellow-400" />
                          <span>{nanny.rating}</span>
                          <span>•</span>
                          <span>{nanny.experience_level} years experience</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {nanny.id === reassignment.new_nanny_id && (
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                      <div className="text-right">
                        <div className="font-semibold">
                          R{reassignment.bookings?.booking_type === 'short_term' 
                            ? nanny.hourly_rate + '/hr' 
                            : nanny.monthly_rate + '/month'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Available immediately</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Within your area</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between gap-4 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleReject}
              disabled={respondToReassignment.isPending}
            >
              I Need Admin Help
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={respondToReassignment.isPending}
              >
                I'll Decide Later
              </Button>
              <Button 
                onClick={handleAccept}
                disabled={respondToReassignment.isPending}
                className="min-w-[120px]"
              >
                {respondToReassignment.isPending ? 'Confirming...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};