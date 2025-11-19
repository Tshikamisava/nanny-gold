import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Save, Lightbulb } from 'lucide-react';

interface FAQDialogProps {
  trigger?: React.ReactNode;
  onFAQCreated?: () => void;
  editFAQ?: any;
}

export const FAQDialog = ({ trigger, onFAQCreated, editFAQ }: FAQDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: editFAQ?.question || '',
    answer: editFAQ?.answer || '',
    category: editFAQ?.category || 'general',
    keywords: editFAQ?.keywords?.join(', ') || '',
    is_active: editFAQ?.is_active ?? true,
    auto_response_enabled: editFAQ?.auto_response_enabled ?? false
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'booking', label: 'Booking' },
    { value: 'payment', label: 'Payment' },
    { value: 'technical', label: 'Technical' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'dispute', label: 'Dispute' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    try {
      setLoading(true);
      
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const faqData = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        category: formData.category,
        keywords: keywordsArray,
        is_active: formData.is_active,
        auto_response_enabled: formData.auto_response_enabled,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      let error;
      if (editFAQ) {
        const result = await supabase
          .from('faq_articles')
          .update(faqData)
          .eq('id', editFAQ.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('faq_articles')
          .insert(faqData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: editFAQ ? "FAQ updated" : "FAQ created",
        description: editFAQ ? "FAQ article has been updated successfully" : "New FAQ article has been created",
      });

      setFormData({
        question: '',
        answer: '',
        category: 'general',
        keywords: '',
        is_active: true,
        auto_response_enabled: false
      });
      setOpen(false);
      onFAQCreated?.();
    } catch (error) {
      console.error('Error with FAQ:', error);
      toast({
        title: "Error",
        description: editFAQ ? "Failed to update FAQ" : "Failed to create FAQ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create FAQ
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            {editFAQ ? 'Edit FAQ Article' : 'Create FAQ Article'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Question</label>
            <Input
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="What question does this FAQ answer?"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Keywords (comma-separated)</label>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="booking, change, modify"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Answer</label>
            <Textarea
              value={formData.answer}
              onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="Provide a clear, helpful answer..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <label className="text-sm font-medium">Active</label>
                <p className="text-xs text-muted-foreground">Show this FAQ to users</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <label className="text-sm font-medium">Auto-Response</label>
                <p className="text-xs text-muted-foreground">Auto-reply with this FAQ</p>
              </div>
              <Switch
                checked={formData.auto_response_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_response_enabled: checked }))}
              />
            </div>
          </div>

          {formData.auto_response_enabled && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
                <Lightbulb className="w-4 h-4" />
                <span className="font-medium">Auto-Response Enabled</span>
              </div>
              <p className="text-blue-600 text-xs">
                This FAQ will automatically be suggested when users create tickets with matching keywords.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.question.trim() || !formData.answer.trim()} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : (editFAQ ? "Update FAQ" : "Create FAQ")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};