import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  MessageCircle,
  Video,
  AlertCircle
} from 'lucide-react';
import { useInterviews, useUpdateInterview } from '@/hooks/useInterviews';
import { format, isBefore, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const NannyInterviews = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: interviews = [], isLoading } = useInterviews();
  const updateInterview = useUpdateInterview();

  const [requestCancelDialogOpen, setRequestCancelDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [cancellationRequest, setCancellationRequest] = useState('');

  // Setup realtime subscription for interviews
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('nanny-interviews-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `nanny_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Interview change detected:', payload);
          
          // Show notification for new interviews
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Interview Scheduled",
              description: "A client has scheduled an interview with you.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const scheduledInterviews = interviews.filter(i => i.status === 'scheduled');
  const cancelledInterviews = interviews.filter(i => i.status === 'cancelled');
  const completedInterviews = interviews.filter(i => i.status === 'completed');

  const handleRequestCancellation = async () => {
    if (!selectedInterview || !cancellationRequest.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the cancellation request.",
        variant: "destructive"
      });
      return;
    }

    // Find the selected interview to check the date
    const interview = interviews.find(i => i.id === selectedInterview);
    if (!interview) {
      toast({
        title: "Error",
        description: "Interview not found.",
        variant: "destructive"
      });
      return;
    }

    // Check if request is being made after 3pm on the day before
    const interviewDate = new Date(interview.interview_date);
    const dayBefore = new Date(interviewDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(15, 0, 0, 0); // 3pm on day before
    
    const now = new Date();
    
    if (now > dayBefore) {
      toast({
        title: "Cancellation Request Denied",
        description: "Cancellation requests must be made by 3:00 PM on the day before the interview.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update interview with cancellation request
      await updateInterview.mutateAsync({
        id: selectedInterview,
        updates: { 
          notes: `CANCELLATION REQUESTED: ${cancellationRequest}. Requested at ${new Date().toLocaleString()}. Awaiting admin approval.`
        }
      });

      // Create notification for admin
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: null, // This will need to be handled by admin system
          title: 'Interview Cancellation Request',
          message: `Nanny has requested to cancel interview on ${format(interviewDate, 'MMM dd, yyyy')} at ${interview.interview_time}. Reason: ${cancellationRequest}`,
          type: 'cancellation_request',
          data: {
            interview_id: selectedInterview,
            nanny_id: interview.nanny_id,
            client_id: interview.client_id,
            interview_date: interview.interview_date,
            interview_time: interview.interview_time,
            reason: cancellationRequest
          }
        });

      if (notificationError) {
        console.error('Error creating admin notification:', notificationError);
      }
      
      toast({
        title: "Cancellation Request Sent",
        description: "Your cancellation request has been sent to the admin team. They will review and respond within 2 hours.",
      });
      
      setRequestCancelDialogOpen(false);
      setSelectedInterview(null);
      setCancellationRequest('');
    } catch (error) {
      console.error('Failed to send cancellation request:', error);
      toast({
        title: "Error",
        description: "Failed to send cancellation request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMarkCompleted = async (interviewId: string) => {
    try {
      await updateInterview.mutateAsync({
        id: interviewId,
        updates: { status: 'completed' }
      });
    } catch (error) {
      console.error('Failed to mark as completed:', error);
    }
  };


  const InterviewCard = ({ interview }: { interview: any }) => {
    const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time}`);
    const isUpcoming = interviewDateTime > new Date();
    const isPast = interviewDateTime < new Date();
    const hasCancellationRequest = interview.notes?.includes('CANCELLATION REQUESTED');
    
    // Check if cancellation is still allowed (before 3pm day before)
    const canRequestCancellation = () => {
      const interviewDate = new Date(interview.interview_date);
      const dayBefore = new Date(interviewDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(15, 0, 0, 0); // 3pm on day before
      
      const now = new Date();
      return now <= dayBefore;
    };
    
    return (
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base">{interview.client_name || 'Client Family'}</h4>
                <p className="text-sm text-muted-foreground">Interview scheduled</p>
              </div>
            </div>
            <Badge variant={
              interview.status === 'scheduled' ? 'default' :
              interview.status === 'completed' ? 'secondary' :
              'destructive'
            }>
              {interview.status}
            </Badge>
          </div>

          {/* Interview Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">{format(new Date(interview.interview_date), 'EEEE, MMM dd, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium">{interview.interview_time}</p>
              </div>
            </div>
            {interview.meeting_link && (
              <div className="flex items-center gap-2 md:col-span-2">
                <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">Video Call</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes and Status Messages */}
          {interview.notes && !hasCancellationRequest && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm">{interview.notes}</p>
            </div>
          )}
          
          {hasCancellationRequest && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Cancellation Requested:</strong> Waiting for admin approval
              </p>
            </div>
          )}
          
          {interview.cancellation_reason && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                <strong>Cancelled:</strong> {interview.cancellation_reason}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {interview.status === 'scheduled' && (
            <div className="flex gap-2 pt-2 border-t">
              {interview.meeting_link && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => window.open(interview.meeting_link, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Join Video Call
                </Button>
              )}
              
              {isPast && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkCompleted(interview.id)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </Button>
              )}
              
              {!hasCancellationRequest && canRequestCancellation() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedInterview(interview.id);
                    setRequestCancelDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Request Cancellation
                </Button>
              )}
              
              {!canRequestCancellation() && !hasCancellationRequest && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <strong>Cancellation deadline passed</strong><br/>
                  Must request by 3PM day before
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Interviews</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your client interviews and scheduling
        </p>
      </div>

      {/* Interview Tabs */}
      <Card>
        <Tabs defaultValue="scheduled" className="w-full">
          <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
            <TabsTrigger value="scheduled">Scheduled ({scheduledInterviews.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedInterviews.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelledInterviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-4 p-4 m-0">
            {scheduledInterviews.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Interview Guidelines</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        • Be prepared to discuss your experience and approach to childcare<br/>
                        • <strong>Cancellation requests must be made by 3:00 PM on the day before the interview</strong><br/>
                        • All cancellation requests require admin approval<br/>
                        • Mark interviews as completed after they finish
                      </p>
                    </div>
                  </div>
                </div>
                {scheduledInterviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Scheduled Interviews</h3>
                <p className="text-muted-foreground">You don't have any interviews scheduled yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 p-4 m-0">
            {completedInterviews.length > 0 ? (
              completedInterviews.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Completed Interviews</h3>
                <p className="text-muted-foreground">Completed interviews will appear here.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 p-4 m-0">
            {cancelledInterviews.length > 0 ? (
              cancelledInterviews.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Cancelled Interviews</h3>
                <p className="text-muted-foreground">Cancelled interviews will appear here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Request Cancellation Dialog */}
      <Dialog open={requestCancelDialogOpen} onOpenChange={setRequestCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Request Interview Cancellation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Important:</strong> Cancellation requests must be made by 3:00 PM on the day before your interview. 
                After this deadline, only emergency cancellations can be processed by contacting admin directly.
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              Please provide a detailed reason for your cancellation request. Our admin team will review and respond within 2 hours.
            </p>
            <Textarea
              placeholder="Reason for cancellation request..."
              value={cancellationRequest}
              onChange={(e) => setCancellationRequest(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRequestCancelDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestCancellation}
                disabled={!cancellationRequest.trim() || updateInterview.isPending}
              >
                {updateInterview.isPending ? 'Sending...' : 'Request Cancellation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NannyInterviews;