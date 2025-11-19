import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInterviews } from '@/hooks/useInterviews';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Video,
  Phone,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientInterviews() {
  const navigate = useNavigate();
  const { data: interviews, isLoading } = useInterviews();

  const scheduledInterviews = interviews?.filter(interview => 
    interview.status === 'scheduled'
  ) || [];
  
  const completedInterviews = interviews?.filter(interview => 
    interview.status === 'completed'
  ) || [];
  
  const cancelledInterviews = interviews?.filter(interview => 
    interview.status === 'cancelled'
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'in_person': return <MapPin className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const InterviewCard = ({ interview }: { interview: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(interview.status)} text-white text-xs`}>
              {interview.status}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground">
              {getInterviewTypeIcon(interview.interview_type)}
              <span className="text-xs capitalize">{interview.interview_type || 'Video'}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(interview.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">
            {interview.nanny_name || 'Nanny Interview'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {interview.nanny_email}
          </p>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{format(new Date(interview.interview_date), 'EEEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-primary" />
              <span>{interview.interview_time}</span>
            </div>
          </div>
          
          {interview.meeting_link && interview.status === 'scheduled' && (
            <div className="pt-2">
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => window.open(interview.meeting_link, '_blank')}
              >
                Join Interview
              </Button>
            </div>
          )}
          
          {interview.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Notes:</strong> {interview.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, title, description }: { 
    icon: any, 
    title: string, 
    description: string 
  }) => (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your client interviews and scheduling
          </p>
        </div>
      </div>

      {/* Interview Tabs */}
      <Tabs defaultValue="scheduled" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-0.5">
          <TabsTrigger value="scheduled" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Scheduled</span>
            <span className="sm:hidden">({scheduledInterviews.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Completed</span>
            <span className="sm:hidden">({completedInterviews.length})</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm px-2 sm:px-4">
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Cancelled</span>
            <span className="sm:hidden">({cancelledInterviews.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledInterviews.length === 0 ? (
                <EmptyState 
                  icon={Calendar}
                  title="No Scheduled Interviews"
                  description="You don't have any interviews scheduled yet."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {scheduledInterviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              {completedInterviews.length === 0 ? (
                <EmptyState 
                  icon={CheckCircle}
                  title="No Completed Interviews"
                  description="Completed interviews will appear here once they're finished."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedInterviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              {cancelledInterviews.length === 0 ? (
                <EmptyState 
                  icon={XCircle}
                  title="No Cancelled Interviews"
                  description="Cancelled interviews will be shown here."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cancelledInterviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}