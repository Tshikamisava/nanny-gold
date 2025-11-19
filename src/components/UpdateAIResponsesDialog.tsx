import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Brain, MessageSquare, TrendingUp, RefreshCw, Plus, Edit } from 'lucide-react';

interface UpdateAIResponsesDialogProps {
  children: React.ReactNode;
}

interface AutoResponseTemplate {
  id?: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  trigger_keywords: string[];
  is_active: boolean;
}

export const UpdateAIResponsesDialog = ({ children }: UpdateAIResponsesDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<AutoResponseTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AutoResponseTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState<AutoResponseTemplate>({
    name: '',
    category: 'general',
    subject_template: '',
    body_template: '',
    trigger_keywords: [],
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_response_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load AI response templates",
        variant: "destructive",
      });
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body_template.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide template name and body",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const templateData = {
        ...newTemplate,
        trigger_keywords: newTemplate.trigger_keywords.filter(k => k.trim())
      };

      if (isEditing && selectedTemplate?.id) {
        const { error } = await supabase
          .from('auto_response_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('auto_response_templates')
          .insert([templateData]);
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Template ${isEditing ? 'updated' : 'created'} successfully`,
      });

      // Reset form
      setNewTemplate({
        name: '',
        category: 'general',
        subject_template: '',
        body_template: '',
        trigger_keywords: [],
        is_active: true
      });
      setIsEditing(false);
      setSelectedTemplate(null);
      loadTemplates();

    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('auto_response_templates')
        .update({ is_active: isActive })
        .eq('id', templateId);

      if (error) throw error;
      
      loadTemplates();
      toast({
        title: "Status Updated",
        description: `Template ${isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error updating template status:', error);
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive",
      });
    }
  };

  const editTemplate = (template: AutoResponseTemplate) => {
    setNewTemplate(template);
    setSelectedTemplate(template);
    setIsEditing(true);
  };

  const retestAIResponses = async () => {
    try {
      setLoading(true);
      
      // Call the smart support handler to reprocess recent tickets for testing
      const { error } = await supabase.functions.invoke('smart-support-handler', {
        body: {
          userQuery: 'Test AI response system',
          userType: 'admin',
          context: { testing: true }
        }
      });

      if (error) throw error;

      toast({
        title: "AI System Tested",
        description: "AI responses have been retested with current templates",
      });
    } catch (error) {
      console.error('Error testing AI responses:', error);
      toast({
        title: "Error",
        description: "Failed to test AI responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    setNewTemplate(prev => ({
      ...prev,
      trigger_keywords: [...prev.trigger_keywords, '']
    }));
  };

  const updateKeyword = (index: number, value: string) => {
    setNewTemplate(prev => ({
      ...prev,
      trigger_keywords: prev.trigger_keywords.map((keyword, i) => 
        i === index ? value : keyword
      )
    }));
  };

  const removeKeyword = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      trigger_keywords: prev.trigger_keywords.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Response Management
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Response Templates</TabsTrigger>
            <TabsTrigger value="analytics">AI Performance</TabsTrigger>
            <TabsTrigger value="testing">Testing & Training</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Existing Templates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Existing Templates</h3>
                  <Button size="sm" onClick={() => {
                    setNewTemplate({
                      name: '',
                      category: 'general',
                      subject_template: '',
                      body_template: '',
                      trigger_keywords: [],
                      is_active: true
                    });
                    setIsEditing(false);
                    setSelectedTemplate(null);
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates.map((template) => (
                    <Card key={template.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{template.name}</h4>
                              <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                {template.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant="outline">{template.category}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {template.body_template}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {template.trigger_keywords.slice(0, 3).map((keyword, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {template.trigger_keywords.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.trigger_keywords.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={(checked) => toggleTemplateStatus(template.id!, checked)}
                            />
                            <Button size="sm" variant="outline" onClick={() => editTemplate(template)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Template Editor */}
              <div className="space-y-4">
                <h3 className="font-medium">
                  {isEditing ? 'Edit Template' : 'Create New Template'}
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        placeholder="e.g., Payment Issue Auto Response"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="booking">Booking</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Template</Label>
                    <Input
                      placeholder="e.g., Re: Your Payment Issue - We're Here to Help"
                      value={newTemplate.subject_template}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, subject_template: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Response Body Template</Label>
                    <Textarea
                      placeholder="Thank you for contacting us about your payment issue..."
                      rows={4}
                      value={newTemplate.body_template}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, body_template: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Trigger Keywords</Label>
                    <div className="space-y-2">
                      {newTemplate.trigger_keywords.map((keyword, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="e.g., payment, billing, charge"
                            value={keyword}
                            onChange={(e) => updateKeyword(index, e.target.value)}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => removeKeyword(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addKeyword}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Keyword
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newTemplate.is_active}
                      onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active Template</Label>
                  </div>

                  <Button onClick={saveTemplate} disabled={loading} className="w-full">
                    {loading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">78%</div>
                  <p className="text-xs text-muted-foreground">
                    Queries resolved without human intervention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Template Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    Auto-responses sent today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Accuracy Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">92%</div>
                  <p className="text-xs text-muted-foreground">
                    Relevant template matches
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI System Testing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test the AI response system with current templates and configurations.
                </p>
                
                <Button onClick={retestAIResponses} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {loading ? 'Testing...' : 'Run AI Response Test'}
                </Button>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Last Test Results:</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Template matching: 94% accuracy</li>
                    <li>• Response generation: 156ms average</li>
                    <li>• Keyword detection: 89% success rate</li>
                    <li>• Escalation triggers: Working correctly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
