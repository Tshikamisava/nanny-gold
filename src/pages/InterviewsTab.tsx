import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  MessageCircle,
  Video,
  Plus,
  AlertCircle
} from 'lucide-react';
import { useInterviews, useCancelInterview, useUpdateInterview } from '@/hooks/useInterviews';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const InterviewsTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: interviews = [], isLoading } = useInterviews();
  const cancelInterview = useCancelInterview();
  const updateInterview = useUpdateInterview();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const scheduledInterviews = interviews.filter(i => i.status === 'scheduled');
  const cancelledInterviews = interviews.filter(i => i.status === 'cancelled');
  const completedInterviews = interviews.filter(i => i.status === 'completed');

  const handleCancelInterview = async () => {
    if (!selectedInterview || !cancellationReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for cancellation.",
        variant: "destructive"
      });
      return;
    }

    try {
      await cancelInterview.mutateAsync({
        id: selectedInterview,
        cancellation_reason: cancellationReason
      });
      
      setCancelDialogOpen(false);
      setSelectedInterview(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Cancellation failed:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const InterviewCard = ({ interview }: { interview: any }) => {
    const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time}`);
    const isUpcoming = interviewDateTime > new Date();
    const isPast = interviewDateTime < new Date();
    
    return (
      <Card className="royal-shadow mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-200 to-pink-200 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900">{interview.nanny_name}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(interview.interview_date), 'MMM dd, yyyy')}</span>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>{interview.interview_time}</span>
                </div>
                {interview.notes && (
                  <p className="text-sm text-gray-500 mt-2">{interview.notes}</p>
                )}
                {interview.cancellation_reason && (
                  <div className="mt-2 p-2 bg-red-50 rounded-md">
                    <p className="text-sm text-red-600">
                      <strong>Cancelled:</strong> {interview.cancellation_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={getStatusColor(interview.status)}>
                {interview.status}
              </Badge>
              
              {interview.status === 'scheduled' && (
                <div className="flex space-x-1">
                  {interview.meeting_link && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(interview.meeting_link, '_blank')}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {isPast && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkCompleted(interview.id)}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedInterview(interview.id);
                      setCancelDialogOpen(true);
                    }}
                    className="text-red-700 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">Loading interviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-900">Interviews</h2>
          <p className="text-gray-600">Manage your nanny interviews</p>
        </div>
        <Button 
          onClick={() => navigate('/match-results')}
          className="royal-gradient text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule New
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="royal-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">{scheduledInterviews.length}</h3>
                <p className="text-gray-600 text-sm">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="royal-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">{completedInterviews.length}</h3>
                <p className="text-gray-600 text-sm">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="royal-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">{cancelledInterviews.length}</h3>
                <p className="text-gray-600 text-sm">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interview Tabs */}
      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">Scheduled ({scheduledInterviews.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedInterviews.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledInterviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledInterviews.length > 0 ? (
            scheduledInterviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))
          ) : (
            <Card className="royal-shadow">
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Scheduled Interviews</h3>
                <p className="text-gray-500 mb-4">You don't have any interviews scheduled yet.</p>
                <Button 
                  onClick={() => navigate('/match-results')}
                  className="royal-gradient text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Your First Interview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedInterviews.length > 0 ? (
            completedInterviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))
          ) : (
            <Card className="royal-shadow">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Completed Interviews</h3>
                <p className="text-gray-500">Completed interviews will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledInterviews.length > 0 ? (
            cancelledInterviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))
          ) : (
            <Card className="royal-shadow">
              <CardContent className="p-8 text-center">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cancelled Interviews</h3>
                <p className="text-gray-500">Cancelled interviews will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Interview Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Cancel Interview</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Please provide a reason for cancelling this interview. This will help us improve our service.
            </p>
            <Textarea
              placeholder="Reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
              >
                Keep Interview
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInterview}
                disabled={!cancellationReason.trim() || cancelInterview.isPending}
              >
                {cancelInterview.isPending ? 'Cancelling...' : 'Cancel Interview'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewsTab;