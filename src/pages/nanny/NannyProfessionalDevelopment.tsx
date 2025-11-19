import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlayCircle, FileText, HelpCircle, CheckSquare, Clock, AlertTriangle, GraduationCap, ExternalLink, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ProfessionalDevelopmentItem {
  id: string;
  assignment_id: string;
  title: string;
  description: string;
  content_type: 'video' | 'document' | 'quiz' | 'task';
  content_url: string;
  is_mandatory: boolean;
  due_date: string | null;
  estimated_duration_minutes: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  completed_at?: string;
  score?: number;
}

export const NannyProfessionalDevelopment = () => {
  const [items, setItems] = useState<ProfessionalDevelopmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ProfessionalDevelopmentItem | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadProfessionalDevelopment();
  }, []);

  const loadProfessionalDevelopment = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Get assignments with material details
      const { data: assignments, error: assignmentsError } = await supabase
        .from('professional_development_assignments')
        .select(`
          id,
          status,
          due_date,
          professional_development_materials (
            id,
            title,
            description,
            content_type,
            content_url,
            is_mandatory,
            estimated_duration_minutes
          )
        `)
        .eq('nanny_id', userData.user.id)
        .eq('professional_development_materials.is_active', true);

      if (assignmentsError) throw assignmentsError;

      // Get completions
      const { data: completions, error: completionsError } = await supabase
        .from('professional_development_completions')
        .select('assignment_id, completed_at, score')
        .eq('nanny_id', userData.user.id);

      if (completionsError) throw completionsError;

      // Combine data
      const completionMap = new Map(completions?.map(c => [c.assignment_id, c]) || []);
      
      const combinedData: ProfessionalDevelopmentItem[] = assignments?.map(assignment => {
        const material = assignment.professional_development_materials;
        const completion = completionMap.get(assignment.id);
        
        return {
          id: material.id,
          assignment_id: assignment.id,
          title: material.title,
          description: material.description,
          content_type: material.content_type as 'video' | 'document' | 'quiz' | 'task',
          content_url: material.content_url,
          is_mandatory: material.is_mandatory,
          due_date: assignment.due_date,
          estimated_duration_minutes: material.estimated_duration_minutes,
          status: completion ? 'completed' : assignment.status as 'assigned' | 'in_progress' | 'completed' | 'overdue',
          completed_at: completion?.completed_at,
          score: completion?.score
        };
      }) || [];

      setItems(combinedData);
    } catch (error) {
      console.error('Error loading professional development:', error);
      toast({
        title: "Error loading training materials",
        description: "Could not load your professional development items.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markInProgress = async (item: ProfessionalDevelopmentItem) => {
    try {
      const { error } = await supabase
        .from('professional_development_assignments')
        .update({ status: 'in_progress' })
        .eq('id', item.assignment_id);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.assignment_id === item.assignment_id 
          ? { ...i, status: 'in_progress' as const }
          : i
      ));

      toast({
        title: "Started training",
        description: "Material marked as in progress.",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error updating status",
        description: "Could not update the training status.",
        variant: "destructive"
      });
    }
  };

  const markCompleted = async () => {
    if (!selectedItem) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Create completion record
      const { error: completionError } = await supabase
        .from('professional_development_completions')
        .insert({
          assignment_id: selectedItem.assignment_id,
          nanny_id: userData.user.id,
          material_id: selectedItem.id,
          notes: completionNotes
        });

      if (completionError) throw completionError;

      // Update assignment status
      const { error: updateError } = await supabase
        .from('professional_development_assignments')
        .update({ status: 'completed' })
        .eq('id', selectedItem.assignment_id);

      if (updateError) throw updateError;

      setItems(prev => prev.map(i => 
        i.assignment_id === selectedItem.assignment_id 
          ? { ...i, status: 'completed' as const, completed_at: new Date().toISOString() }
          : i
      ));

      setIsCompletionDialogOpen(false);
      setSelectedItem(null);
      setCompletionNotes('');

      toast({
        title: "Training completed!",
        description: "Great job completing this professional development material.",
      });
    } catch (error) {
      console.error('Error marking completed:', error);
      toast({
        title: "Error completing training",
        description: "Could not mark the training as completed.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'overdue': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      case 'quiz': return <HelpCircle className="w-5 h-5" />;
      case 'task': return <CheckSquare className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading professional development...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2 mb-2">
          <GraduationCap className="w-6 h-6" />
          Professional Development
        </h1>
        <p className="text-muted-foreground">Complete your training materials to stay Gold</p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{completedCount} of {totalCount} completed</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Training Items */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No training materials assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.assignment_id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getContentIcon(item.content_type)}
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.is_mandatory && (
                        <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {getStatusIcon(item.status)}
                        <span className={`text-sm font-medium capitalize ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>Duration: {item.estimated_duration_minutes} min</span>
                      {item.due_date && (
                        <span className={item.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                          Due: {format(new Date(item.due_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                      {item.completed_at && (
                        <span className="text-green-600">
                          Completed: {format(new Date(item.completed_at), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {item.status !== 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.content_url, '_blank')}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {item.status === 'assigned' ? 'Start' : 'Continue'}
                          </Button>
                          
                          {item.status === 'assigned' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markInProgress(item)}
                            >
                              Mark In Progress
                            </Button>
                          )}
                          
                          {item.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsCompletionDialogOpen(true);
                              }}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </>
                      )}
                      
                      {item.status === 'completed' && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Completed</span>
                          {item.score && (
                            <span className="text-sm">• Score: {item.score}%</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Completion Dialog */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Training</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>Congratulations on completing <strong>{selectedItem?.title}</strong>!</p>
            
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about your learning experience..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCompletionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={markCompleted}>
                Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};