import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  Video,
  User
} from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useUpdateInterview } from '@/hooks/useInterviews';
import { supabase } from '@/integrations/supabase/client';

interface InterviewNotificationCardProps {
  interview: any;
  onAccept?: () => void;
  onRequestReschedule?: () => void;
}

const InterviewNotificationCard = ({ 
  interview, 
  onAccept, 
  onRequestReschedule 
}: InterviewNotificationCardProps) => {
  const { toast } = useToast();
  const updateInterview = useUpdateInterview();
  
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time}`);
  const isUpcoming = interviewDateTime > new Date();
  const canReschedule = isBefore(new Date(), addDays(interviewDateTime, -1)); // Can reschedule until 1 day before

  const handleAcceptInterview = async () => {
    try {
      // Update interview to mark as accepted by nanny
      await updateInterview.mutateAsync({
        id: interview.id,
        updates: {
          notes: `${interview.notes || ''}\n\nNanny accepted interview on ${new Date().toLocaleString()}`
        }
      });

      // Create notification for admin
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: null, // Will be handled by admin notification system
          title: 'Interview Accepted',
          message: `Nanny has accepted the verification interview scheduled for ${format(interviewDateTime, 'MMM dd, yyyy')} at ${interview.interview_time}.`,
          type: 'interview_accepted',
          data: {
            interview_id: interview.id,
            interview_date: interview.interview_date,
            interview_time: interview.interview_time,
            nanny_id: interview.nanny_id
          }
        });

      if (notificationError) {
        console.error('Error creating admin notification:', notificationError);
      }

      toast({
        title: "Interview Accepted",
        description: "You've accepted the interview. A calendar invite and meeting details will be sent to you soon.",
      });

      onAccept?.();
    } catch (error) {
      console.error('Failed to accept interview:', error);
      toast({
        title: "Error",
        description: "Failed to accept interview. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRequestReschedule = async () => {
    if (!rescheduleReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for rescheduling.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update interview with reschedule request
      await updateInterview.mutateAsync({
        id: interview.id,
        updates: {
          notes: `${interview.notes || ''}\n\nRESCHEDULE REQUESTED: ${rescheduleReason}. Requested on ${new Date().toLocaleString()}. Awaiting admin response.`
        }
      });

      // Create notification for admin
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: null, // Will be handled by admin notification system
          title: 'Interview Reschedule Request',
          message: `Nanny has requested to reschedule the interview on ${format(interviewDateTime, 'MMM dd, yyyy')} at ${interview.interview_time}. Reason: ${rescheduleReason}`,
          type: 'interview_reschedule_request',
          data: {
            interview_id: interview.id,
            interview_date: interview.interview_date,
            interview_time: interview.interview_time,
            reason: rescheduleReason,
            nanny_id: interview.nanny_id
          }
        });

      if (notificationError) {
        console.error('Error creating admin notification:', notificationError);
      }

      toast({
        title: "Reschedule Request Sent",
        description: "Your reschedule request has been sent to the admin team. They will respond within 2 hours.",
      });

      setIsRescheduleDialogOpen(false);
      setRescheduleReason('');
      onRequestReschedule?.();
    } catch (error) {
      console.error('Failed to request reschedule:', error);
      toast({
        title: "Error",
        description: "Failed to send reschedule request. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base text-blue-900">
                  Verification Interview Scheduled
                </CardTitle>
                <p className="text-sm text-blue-700">Final onboarding step</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Required
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Interview Details */}
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">
                {format(interviewDateTime, 'EEEE, MMMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">
                {interview.interview_time} (1 hour duration)
              </span>
            </div>
            {interview.meeting_link && (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">Video interview</span>
              </div>
            )}
          </div>

          {/* Important Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important Information:</p>
                <ul className="text-xs space-y-1">
                  <li>• This is your final verification step before becoming eligible for bookings</li>
                  <li>• Please be prepared to discuss your childcare experience and approach</li>
                  <li>• Have your ID and relevant certifications ready</li>
                  <li>• Reschedule requests must be made at least 24 hours in advance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interview Notes */}
          {interview.notes && !interview.notes.includes('RESCHEDULE REQUESTED') && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Notes:</p>
              <p className="text-sm text-gray-800">{interview.notes}</p>
            </div>
          )}

          {/* Reschedule Status */}
          {interview.notes?.includes('RESCHEDULE REQUESTED') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Reschedule Requested:</strong> Waiting for admin response
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {isUpcoming && !interview.notes?.includes('RESCHEDULE REQUESTED') && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleAcceptInterview}
                disabled={updateInterview.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept Interview
              </Button>
              
              {canReschedule && (
                <Button
                  variant="outline"
                  onClick={() => setIsRescheduleDialogOpen(true)}
                  disabled={updateInterview.isPending}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Request Reschedule
                </Button>
              )}
            </div>
          )}

          {!canReschedule && isUpcoming && !interview.notes?.includes('RESCHEDULE REQUESTED') && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <strong>Note:</strong> Reschedule deadline has passed. For emergency changes, contact admin directly.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Request Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Request Interview Reschedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Current Interview:</strong><br/>
                {format(interviewDateTime, 'EEEE, MMM dd, yyyy')} at {interview.interview_time}
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Please provide a detailed reason for your reschedule request. Our admin team will review and respond within 2 hours with alternative dates.
            </p>
            
            <Textarea
              placeholder="Reason for reschedule request..."
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={3}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRescheduleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestReschedule}
                disabled={!rescheduleReason.trim() || updateInterview.isPending}
              >
                {updateInterview.isPending ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InterviewNotificationCard;