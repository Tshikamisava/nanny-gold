
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRespondToBackupRequest } from '@/hooks/useBackupNanny';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type BackupRequest = Tables<'backup_nanny_requests'> & {
  backup_nanny: Tables<'nannies'> | null;
  original_booking: Tables<'bookings'> | null;
};

interface BackupNannyNotificationProps {
  request: BackupRequest;
}

export const BackupNannyNotification: React.FC<BackupNannyNotificationProps> = ({ request }) => {
  const respondToRequest = useRespondToBackupRequest();
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      await respondToRequest.mutateAsync({
        id: request.id,
        status: 'accepted',
        createNewBooking: true
      });
      
      toast({
        title: "Backup nanny accepted",
        description: "Your booking has been confirmed with the backup nanny."
      });
    } catch (error) {
      console.error('Error accepting backup nanny:', error);
      toast({
        title: "Error",
        description: "Failed to accept backup nanny. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    try {
      await respondToRequest.mutateAsync({
        id: request.id,
        status: 'rejected'
      });
      
      toast({
        title: "Backup nanny rejected",
        description: "We'll continue looking for other available nannies."
      });
    } catch (error) {
      console.error('Error rejecting backup nanny:', error);
      toast({
        title: "Error",
        description: "Failed to reject backup nanny. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (request.status !== 'pending') {
    return null;
  }

  const timeLeft = request.client_response_deadline 
    ? new Date(request.client_response_deadline).getTime() - new Date().getTime()
    : 0;
  
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-amber-800">Backup Nanny Available</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-amber-700">
          Your original booking was rejected, but we found a backup nanny for you!
        </p>
        
        {request.backup_nanny && (
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold">{request.backup_nanny.bio || 'Backup Nanny'}</h4>
            <p className="text-sm text-gray-600">
              Experience: {request.backup_nanny.experience_level} years
            </p>
            <p className="text-sm text-gray-600">
              Rating: {request.backup_nanny.rating || 'Not rated'}/5
            </p>
            <p className="text-sm text-gray-600">
              Monthly Rate: R{request.backup_nanny.monthly_rate}
            </p>
          </div>
        )}
        
        <p className="text-sm text-amber-600">
          You have {hoursLeft} hours to respond. If no response is received, 
          the backup nanny will be automatically assigned.
        </p>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleAccept}
            disabled={respondToRequest.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            Accept Backup Nanny
          </Button>
          <Button 
            onClick={handleReject}
            disabled={respondToRequest.isPending}
            variant="outline"
          >
            Decline & Keep Looking
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
