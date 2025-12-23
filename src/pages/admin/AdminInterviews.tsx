import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone,
  Video,
  CheckCircle, 
  XCircle, 
  MessageCircle,
  Plus,
  Edit,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { useAdminInterviews, useCreateInterview, useUpdateInterview, useCancelInterview } from '@/hooks/useInterviews';
import InterviewCommunication from '@/components/InterviewCommunication';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useVerificationWorkflow } from '@/hooks/useVerificationWorkflow';

const AdminInterviews = () => {
  const { toast } = useToast();
  const { data: interviews = [], isLoading } = useAdminInterviews();
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();
  const cancelInterview = useCancelInterview();
  const { completeInterviewStep } = useVerificationWorkflow();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    interview_id: '',
    interview_date: '',
    interview_time: '10:00',
    reason: ''
  });

  // Form state for creating interviews
  const [formData, setFormData] = useState({
    nanny_id: '',
    nanny_name: '',
    interview_date: '',
    interview_time: '10:00',
    notes: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Nanny search state
  const [availableNannies, setAvailableNannies] = useState<any[]>([]);
  const [nannySearchTerm, setNannySearchTerm] = useState('');
  const [showNannySuggestions, setShowNannySuggestions] = useState(false);

  // Dialog and interview state
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [interviewResult, setInterviewResult] = useState<'passed' | 'failed'>('passed');
  const [resultNotes, setResultNotes] = useState('');

  const scheduledInterviews = interviews.filter(i => i.status === 'scheduled');
  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const cancelledInterviews = interviews.filter(i => i.status === 'cancelled');

  // Filter interviews based on search and filters
  const filterInterviews = (interviewList: any[]) => {
    return interviewList.filter(interview => {
      // Search filter
      const searchMatch = !searchTerm || 
        interview.nanny_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.nanny_email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === 'all' || interview.status === statusFilter;

      // Date filter
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const interviewDate = new Date(interview.interview_date);
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        switch (dateFilter) {
          case 'today':
            dateMatch = interviewDate.toDateString() === today.toDateString();
            break;
          case 'week':
            dateMatch = interviewDate >= today && interviewDate <= weekFromNow;
            break;
          case 'month':
            dateMatch = interviewDate >= today && interviewDate <= monthFromNow;
            break;
        }
      }

      return searchMatch && statusMatch && dateMatch;
    });
  };

  const filteredScheduled = filterInterviews(scheduledInterviews);
  const filteredCompleted = filterInterviews(completedInterviews);
  const filteredCancelled = filterInterviews(cancelledInterviews);

  // Load available nannies for search
  const loadAvailableNannies = async () => {
    try {
      const { data, error } = await supabase
        .from('nannies')
        .select(`
          id,
          approval_status,
          verification_status,
          interview_status,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .in('verification_status', ['interview_required', 'document_pending'])
        .order('verification_status', { ascending: false })
        .order('profiles.first_name', { ascending: true });

      if (error) throw error;
      setAvailableNannies(data || []);
    } catch (error) {
      console.error('Error loading nannies:', error);
    }
  };

  // Load nannies when component mounts
  useEffect(() => {
    loadAvailableNannies();
  }, []);

  // Filter nannies based on search term
  const filteredNannies = availableNannies.filter(nanny => {
    const fullName = `${nanny.profiles?.first_name || ''} ${nanny.profiles?.last_name || ''}`.toLowerCase();
    return fullName.includes(nannySearchTerm.toLowerCase());
  });

  const selectNanny = (nanny: any) => {
    setFormData(prev => ({
      ...prev,
      nanny_id: nanny.id,
      nanny_name: `${nanny.profiles?.first_name || ''} ${nanny.profiles?.last_name || ''}`
    }));
    setNannySearchTerm(`${nanny.profiles?.first_name || ''} ${nanny.profiles?.last_name || ''}`);
    setShowNannySuggestions(false);
  };

  // Function to schedule interview directly from verification screen
  const scheduleInterviewForNanny = (nannyId: string, nannyName: string) => {
    setFormData(prev => ({
      ...prev,
      nanny_id: nannyId,
      nanny_name: nannyName,
      interview_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
      interview_time: '10:00',
      notes: 'Verification interview scheduled from onboarding screen'
    }));
    setNannySearchTerm(nannyName);
    setIsCreateDialogOpen(true);
  };

  // Make this function available globally for navigation from verification screen
  useEffect(() => {
    (window as any).scheduleInterviewForNanny = scheduleInterviewForNanny;
    return () => {
      delete (window as any).scheduleInterviewForNanny;
    };
  }, [scheduleInterviewForNanny]);

  const handleCreateInterview = async () => {
    if (!formData.nanny_id || !formData.interview_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create interview - Jitsi link will be auto-generated
      await createInterview.mutateAsync({
        nanny_id: formData.nanny_id,
        interview_date: formData.interview_date,
        interview_time: formData.interview_time,
        notes: formData.notes || 'Admin scheduled verification interview'
      });

      setIsCreateDialogOpen(false);
      setFormData({
        nanny_id: '',
        nanny_name: '',
        interview_date: '',
        interview_time: '10:00',
        notes: ''
      });
      setNannySearchTerm('');
    } catch (error) {
      console.error('Failed to create interview:', error);
    }
  };

  const handleRescheduleInterview = async () => {
    if (!rescheduleData.interview_id || !rescheduleData.interview_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateInterview.mutateAsync({
        id: rescheduleData.interview_id,
        updates: { 
          interview_date: rescheduleData.interview_date,
          interview_time: rescheduleData.interview_time,
          notes: `${selectedInterview?.notes || ''}\n\nRescheduled: ${rescheduleData.reason || 'Admin rescheduled interview'}`
        }
      });

      setIsRescheduleDialogOpen(false);
      setSelectedInterview(null);
      setRescheduleData({
        interview_id: '',
        interview_date: '',
        interview_time: '10:00',
        reason: ''
      });
    } catch (error) {
      console.error('Failed to reschedule interview:', error);
    }
  };

  const handleCompleteInterview = async () => {
    if (!selectedInterview) {
      toast({
        title: "Error",
        description: "No interview selected.",
        variant: "destructive"
      });
      return;
    }

    try {
      const resultText = interviewResult === 'passed' ? 'PASSED' : 'FAILED';
      const updatedNotes = `${selectedInterview.notes || ''}\n\nInterview Result: ${resultText}\n${resultNotes || 'No additional notes.'}`.trim();

      await updateInterview.mutateAsync({
        id: selectedInterview.id,
        updates: {
          status: 'completed',
          notes: updatedNotes
        }
      });

      // Complete the interview step in verification workflow
      await completeInterviewStep(selectedInterview.nanny_id, interviewResult);

      setIsCompleteDialogOpen(false);
      setSelectedInterview(null);
      setInterviewResult('passed');
      setResultNotes('');

      toast({
        title: "Interview Completed",
        description: `Interview marked as ${resultText.toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Failed to complete interview:', error);
      toast({
        title: "Error",
        description: "Failed to complete interview. Please try again.",
        variant: "destructive"
      });
    }
  };

  const InterviewCard = ({ interview }: { interview: any }) => {
    const isUpcoming = new Date(`${interview.interview_date}T${interview.interview_time}`) > new Date();
    
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
                <h4 className="font-semibold text-base">{interview.nanny_name || 'Nanny'}</h4>
                <p className="text-sm text-muted-foreground">{interview.nanny_email}</p>
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
                  <p className="text-xs text-muted-foreground">Meeting</p>
                  <p className="text-sm font-medium">Video Call Scheduled</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {interview.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm">{interview.notes}</p>
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
                  Join Call
                </Button>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedInterview(interview);
                  setIsCompleteDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Complete Interview
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedInterview(interview);
                  setRescheduleData({
                    interview_id: interview.id,
                    interview_date: interview.interview_date,
                    interview_time: interview.interview_time,
                    reason: ''
                  });
                  setIsRescheduleDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Reschedule
              </Button>
            </div>
          )}
          
          {/* Communication Component for Active Interviews */}
          {interview.status === 'scheduled' && (
            <div className="mt-4 pt-4 border-t">
              <InterviewCommunication 
                interview={interview} 
                userType="admin" 
              />
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interview Management</h2>
          <p className="text-muted-foreground">
            Manage verification interviews and onboarding sessions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Interview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="nanny_search">Select Nanny</Label>
                <Input
                  id="nanny_search"
                  placeholder="Search for nanny by name..."
                  value={nannySearchTerm}
                  onChange={(e) => {
                    setNannySearchTerm(e.target.value);
                    setShowNannySuggestions(true);
                    if (!e.target.value) {
                      setFormData(prev => ({ ...prev, nanny_id: '', nanny_name: '' }));
                    }
                  }}
                  onFocus={() => setShowNannySuggestions(true)}
                />
                {showNannySuggestions && nannySearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredNannies.length > 0 ? (
                      filteredNannies.map((nanny) => (
                        <div
                          key={nanny.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => selectNanny(nanny)}
                        >
                          <div className="font-medium">
                            {nanny.profiles?.first_name} {nanny.profiles?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{nanny.profiles?.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={nanny.verification_status === 'interview_required' ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {nanny.verification_status.replace('_', ' ')}
                            </Badge>
                            {nanny.interview_status && (
                              <Badge variant="secondary" className="text-xs">
                                {nanny.interview_status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500">
                        {availableNannies.length === 0 
                          ? 'No nannies available for interviews. Nannies must have their documents verified first.'
                          : 'No matches found. Try a different search term.'
                        }
                      </div>
                    )}
                  </div>
                )}
                {formData.nanny_id && (
                  <div className="mt-1 text-sm text-green-600">
                    ✓ Selected: {formData.nanny_name}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="interview_date">Interview Date</Label>
                <Input
                  id="interview_date"
                  type="date"
                  value={formData.interview_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, interview_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="interview_time">Time</Label>
                <Input
                  id="interview_time"
                  type="time"
                  value={formData.interview_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, interview_time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInterview} disabled={createInterview.isPending}>
                  {createInterview.isPending ? 'Scheduling...' : 'Schedule Interview'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviews.length}</div>
            <p className="text-xs text-muted-foreground">
              All time interviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledInterviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming interviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedInterviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedInterviews.length > 0 
                ? Math.round((completedInterviews.filter(i => i.notes?.includes('PASSED')).length / completedInterviews.length) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Interview success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by nanny name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview Tabs */}
      <Card>
        <Tabs defaultValue="scheduled" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scheduled">Scheduled ({filteredScheduled.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filteredCompleted.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({filteredCancelled.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-4 p-6">
            {filteredScheduled.length > 0 ? (
              filteredScheduled.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Scheduled Interviews</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? 'No interviews match your current filters.' 
                    : 'No verification interviews are currently scheduled.'
                  }
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 p-6">
            {filteredCompleted.length > 0 ? (
              filteredCompleted.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Completed Interviews</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? 'No interviews match your current filters.' 
                    : 'Completed interviews will appear here.'
                  }
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 p-6">
            {filteredCancelled.length > 0 ? (
              filteredCancelled.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Cancelled Interviews</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? 'No interviews match your current filters.' 
                    : 'Cancelled interviews will appear here.'
                  }
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Complete Interview Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nanny:</strong> {selectedInterview?.nanny_name}<br/>
                <strong>Date:</strong> {selectedInterview?.interview_date && format(new Date(selectedInterview.interview_date), 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div>
              <Label>Interview Result</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={interviewResult === 'passed' ? 'default' : 'outline'}
                  onClick={() => setInterviewResult('passed')}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Passed
                </Button>
                <Button
                  variant={interviewResult === 'failed' ? 'destructive' : 'outline'}
                  onClick={() => setInterviewResult('failed')}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Failed
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="result_notes">Notes</Label>
              <Textarea
                id="result_notes"
                placeholder="Interview feedback and notes..."
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteInterview} disabled={updateInterview.isPending}>
                {updateInterview.isPending ? 'Completing...' : 'Complete Interview'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Interview Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nanny:</strong> {selectedInterview?.nanny_name}<br/>
                <strong>Current Date:</strong> {selectedInterview?.interview_date && format(new Date(selectedInterview.interview_date), 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div>
              <Label htmlFor="reschedule_date">New Interview Date</Label>
              <Input
                id="reschedule_date"
                type="date"
                value={rescheduleData.interview_date}
                onChange={(e) => setRescheduleData(prev => ({ ...prev, interview_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="reschedule_time">New Time</Label>
              <Input
                id="reschedule_time"
                type="time"
                value={rescheduleData.interview_time}
                onChange={(e) => setRescheduleData(prev => ({ ...prev, interview_time: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="reschedule_reason">Reason for Rescheduling</Label>
              <Textarea
                id="reschedule_reason"
                placeholder="Reason for rescheduling..."
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRescheduleInterview} disabled={updateInterview.isPending}>
                {updateInterview.isPending ? 'Rescheduling...' : 'Reschedule Interview'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInterviews;