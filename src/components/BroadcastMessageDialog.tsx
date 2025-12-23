import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Users, Send, AlertTriangle, Info } from 'lucide-react';

interface BroadcastMessageDialogProps {
  children: React.ReactNode;
}

export const BroadcastMessageDialog = ({ children }: BroadcastMessageDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    title: '',
    content: '',
    audience: 'all', // all, clients, nannies, admins
    priority: 'info', // info, warning, urgent
    sendEmail: false,
    sendPush: true
  });

  const handleSendBroadcast = async () => {
    if (!message.title.trim() || !message.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message content",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get target users based on audience selection
      let targetUsers: string[] = [];
      
      if (message.audience === 'all') {
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id');
        targetUsers = allUsers?.map(u => u.id) || [];
      } else if (message.audience === 'admins') {
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        targetUsers = adminUsers?.map(u => u.user_id) || [];
      } else if (message.audience === 'clients') {
        const { data: clientUsers } = await supabase
          .from('clients')
          .select('id');
        targetUsers = clientUsers?.map(u => u.id) || [];
      } else if (message.audience === 'nannies') {
        const { data: nannyUsers } = await supabase
          .from('nannies')
          .select('id');
        targetUsers = nannyUsers?.map(u => u.id) || [];
      }

      // Create notifications for all target users
      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        title: message.title,
        message: message.content,
        type: 'broadcast',
        data: {
          priority: message.priority,
          audience: message.audience,
          sent_by: 'admin'
        }
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Send email if requested
      if (message.sendEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-support-email', {
          body: {
            type: 'broadcast',
            recipients: targetUsers,
            subject: message.title,
            content: message.content,
            priority: message.priority
          }
        });
        
        if (emailError) {
          console.warn('Email sending failed:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast({
        title: "Broadcast Sent",
        description: `Message sent to ${targetUsers.length} users`,
      });

      // Reset form
      setMessage({
        title: '',
        content: '',
        audience: 'all',
        priority: 'info',
        sendEmail: false,
        sendPush: true
      });
      setIsOpen(false);

    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: "Error",
        description: "Failed to send broadcast message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'all': return <Users className="w-4 h-4" />;
      case 'clients': return <Users className="w-4 h-4 text-blue-500" />;
      case 'nannies': return <Users className="w-4 h-4 text-green-500" />;
      case 'admins': return <Users className="w-4 h-4 text-fuchsia-500" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Broadcast Message
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Message Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Message Title</Label>
              <Input
                id="title"
                placeholder="e.g., Scheduled Maintenance, New Feature Announcement"
                value={message.title}
                onChange={(e) => setMessage(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your broadcast message here..."
                rows={4}
                value={message.content}
                onChange={(e) => setMessage(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={message.audience} onValueChange={(value) => setMessage(prev => ({ ...prev, audience: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="clients">Clients Only</SelectItem>
                    <SelectItem value="nannies">Nannies Only</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select value={message.priority} onValueChange={(value) => setMessage(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="space-y-3">
              <Label>Delivery Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="push" 
                    checked={message.sendPush}
                    onCheckedChange={(checked) => setMessage(prev => ({ ...prev, sendPush: checked as boolean }))}
                  />
                  <Label htmlFor="push" className="text-sm">Send in-app notification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="email" 
                    checked={message.sendEmail}
                    onCheckedChange={(checked) => setMessage(prev => ({ ...prev, sendEmail: checked as boolean }))}
                  />
                  <Label htmlFor="email" className="text-sm">Send email notification</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Preview:</span>
                <Badge variant={getPriorityColor(message.priority)}>
                  {message.priority.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getAudienceIcon(message.audience)}
                  <span>{message.audience === 'all' ? 'All Users' : message.audience.charAt(0).toUpperCase() + message.audience.slice(1)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">{message.title || 'Message Title'}</h4>
                <p className="text-sm text-muted-foreground">
                  {message.content || 'Message content will appear here...'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warning for urgent messages */}
          {message.priority === 'urgent' && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm text-orange-900 mb-1">Urgent Message Notice</h4>
                    <p className="text-xs text-orange-800">
                      Urgent messages will trigger immediate notifications and may interrupt user activity. 
                      Use only for critical system announcements or safety-related communications.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendBroadcast} disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};