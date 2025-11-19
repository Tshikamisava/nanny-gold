import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Users, CheckCircle, Clock, AlertTriangle, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PDMaterial {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'document' | 'quiz' | 'task';
  content_url: string;
  is_mandatory: boolean;
  due_date: string | null;
  estimated_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

interface AssignmentStats {
  total_assigned: number;
  completed: number;
  in_progress: number;
  overdue: number;
}

export const AdminProfessionalDevelopment = () => {
  const [materials, setMaterials] = useState<PDMaterial[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({ total_assigned: 0, completed: 0, in_progress: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'video' as const,
    content_url: '',
    is_mandatory: true,
    due_date: undefined as Date | undefined,
    estimated_duration_minutes: 30
  });

  useEffect(() => {
    loadMaterials();
    loadStats();
  }, []);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('professional_development_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials((data || []).map(item => ({
        ...item,
        content_type: item.content_type as 'video' | 'document' | 'quiz' | 'task'
      })));
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: "Error loading materials",
        description: "Could not load professional development materials.",
        variant: "destructive"
      });
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('professional_development_assignments')
        .select('status');

      if (error) throw error;

      const statsData = data?.reduce((acc, assignment) => {
        acc.total_assigned++;
        if (assignment.status === 'completed') acc.completed++;
        else if (assignment.status === 'in_progress') acc.in_progress++;
        else if (assignment.status === 'overdue') acc.overdue++;
        return acc;
      }, { total_assigned: 0, completed: 0, in_progress: 0, overdue: 0 }) || { total_assigned: 0, completed: 0, in_progress: 0, overdue: 0 };

      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('professional_development_materials')
        .insert({
          title: formData.title,
          description: formData.description,
          content_type: formData.content_type,
          content_url: formData.content_url,
          is_mandatory: formData.is_mandatory,
          due_date: formData.due_date?.toISOString(),
          estimated_duration_minutes: formData.estimated_duration_minutes,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-assign to all nannies
      await supabase.rpc('assign_material_to_all_nannies', {
        p_material_id: data.id,
        p_due_date: formData.due_date?.toISOString()
      });

      toast({
        title: "Material created and assigned",
        description: "The material has been created and assigned to all nannies.",
      });

      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        content_type: 'video',
        content_url: '',
        is_mandatory: true,
        due_date: undefined,
        estimated_duration_minutes: 30
      });

      loadMaterials();
      loadStats();
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: "Error creating material",
        description: "Could not create the material. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'document': return '📄';
      case 'quiz': return '❓';
      case 'task': return '✓';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-8 h-8" />
            Professional Development
          </h1>
          <p className="text-muted-foreground">Manage training materials and track nanny compliance</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Professional Development Material</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter material title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter material description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="content_type">Content Type</Label>
                  <Select
                    value={formData.content_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="content_url">Content URL</Label>
                <Input
                  id="content_url"
                  value={formData.content_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_url: e.target.value }))}
                  placeholder="Enter URL to the content"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="mandatory"
                  checked={formData.is_mandatory}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_mandatory: checked }))}
                />
                <Label htmlFor="mandatory">Mandatory completion</Label>
              </div>
              
              <div>
                <Label>Due Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(formData.due_date, "PPP") : "Select due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMaterial} disabled={!formData.title || !formData.content_url}>
                  Create & Assign to All Nannies
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_assigned}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle>Training Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No professional development materials created yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div key={material.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getContentTypeIcon(material.content_type)}</span>
                        <h3 className="font-semibold">{material.title}</h3>
                        {material.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                        )}
                        {!material.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{material.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Duration: {material.estimated_duration_minutes} min</span>
                        {material.due_date && (
                          <span>Due: {format(new Date(material.due_date), 'MMM dd, yyyy')}</span>
                        )}
                        <span>Created: {format(new Date(material.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};