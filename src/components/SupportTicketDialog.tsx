import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, Plus } from 'lucide-react';

interface SupportTicketDialogProps {
  trigger?: React.ReactNode;
  onTicketCreated?: () => void;
}

export const SupportTicketDialog = ({ trigger, onTicketCreated }: SupportTicketDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) return;

    try {
      setLoading(true);
      
      // Get intelligent priority determination
      const { data: priorityData } = await supabase.functions.invoke('determine-ticket-priority', {
        body: {
          subject: formData.subject,
          description: formData.description,
          category: formData.category,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }
      });

      const determinedPriority = priorityData?.priority || formData.priority;
      
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: determinedPriority
        });

      if (error) throw error;

      // Send auto-response email if category matches triggers
      if (formData.category === 'bespoke_arrangement') {
        await supabase.functions.invoke('send-support-email', {
          body: {
            type: 'bespoke_arrangement',
            subject: formData.subject,
            description: formData.description,
            userEmail: (await supabase.auth.getUser()).data.user?.email
          }
        });
      }

      const priorityMessage = priorityData?.priority !== formData.priority 
        ? ` (Auto-adjusted to ${priorityData.priority} priority based on content analysis)`
        : '';

      toast({
        title: "Support ticket created",
        description: `We'll respond to your request as soon as possible${priorityMessage}`,
      });

      setFormData({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium'
      });
      setOpen(false);
      onTicketCreated?.();
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'general', label: 'General Support' },
    { value: 'booking', label: 'Booking Issue' },
    { value: 'payment', label: 'Payment Problem' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'bespoke_arrangement', label: 'Bespoke Arrangement' },
    { value: 'dispute', label: 'Dispute' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Support Ticket
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Create Support Ticket
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief description of your issue"
              required
            />
          </div>

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
            {formData.category === 'bespoke_arrangement' && (
              <p className="text-xs text-muted-foreground mt-1">
                This will automatically send an email to care@nannygold.co.za
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Priority</label>
            <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map(priority => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                      {priority.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide details about your issue..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.subject.trim() || !formData.description.trim()} className="flex-1">
              {loading ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};