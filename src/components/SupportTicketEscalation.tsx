import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface SupportTicketEscalationProps {
  ticket: {
    id: string;
    subject: string;
    priority: string;
    status: string;
  };
  onEscalated?: () => void;
}

export const SupportTicketEscalation = ({ ticket, onEscalated }: SupportTicketEscalationProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [targetPriority, setTargetPriority] = useState('');

  const priorities = [
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
  ];

  const escalationReasons = [
    'Customer complaint escalation',
    'Technical complexity requires senior support',
    'Time-sensitive issue requiring immediate attention',
    'VIP customer requiring priority handling',
    'Potential safety concern',
    'Recurring issue pattern identified',
    'Customer satisfaction at risk',
    'Business impact assessment needed'
  ];

  const handleEscalate = async () => {
    if (!escalationReason.trim() || !targetPriority) {
      toast({
        title: "Missing information",
        description: "Please provide escalation reason and target priority",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Call escalation edge function
      const { error } = await supabase.functions.invoke('escalate-support-ticket', {
        body: {
          ticketId: ticket.id,
          escalationReason: escalationReason.trim(),
          targetPriority: targetPriority
        }
      });

      if (error) throw error;

      toast({
        title: "Ticket escalated",
        description: `Ticket has been escalated to ${targetPriority} priority`,
      });

      setEscalationReason('');
      setTargetPriority('');
      setOpen(false);
      onEscalated?.();
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to escalate ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canEscalate = () => {
    const currentPriorityLevel = priorities.findIndex(p => p.value === ticket.priority);
    return currentPriorityLevel !== -1 && currentPriorityLevel < priorities.length - 1;
  };

  const getAvailablePriorities = () => {
    const currentPriorityLevel = priorities.findIndex(p => p.value === ticket.priority);
    return priorities.slice(currentPriorityLevel + 1);
  };

  if (!canEscalate()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
          <TrendingUp className="w-4 h-4 mr-2" />
          Escalate
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Escalate Support Ticket
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-1">{ticket.subject}</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Current: {ticket.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Status: {ticket.status}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Escalation Reason</label>
            <Select value={escalationReason} onValueChange={setEscalationReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason for escalation" />
              </SelectTrigger>
              <SelectContent>
                {escalationReasons.map(reason => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom reason...</SelectItem>
              </SelectContent>
            </Select>
            
            {escalationReason === 'custom' && (
              <Textarea
                placeholder="Enter custom escalation reason..."
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Target Priority</label>
            <Select value={targetPriority} onValueChange={setTargetPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select new priority level" />
              </SelectTrigger>
              <SelectContent>
                {getAvailablePriorities().map(priority => (
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

          {targetPriority === 'urgent' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Urgent Priority Notice</span>
              </div>
              <p className="text-red-600 text-xs mt-1">
                Escalating to urgent will trigger immediate notifications to all admins and send email alerts.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleEscalate} 
              disabled={loading || !escalationReason.trim() || !targetPriority} 
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Escalating..." : "Escalate Ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};