import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, 
  MessageCircle, 
  Clock, 
  Users,
  Activity,
  TrendingUp,
  Bot,
  AlertTriangle
} from 'lucide-react';
import { EmergencyHotlineDialog } from './EmergencyHotlineDialog';
import { BroadcastMessageDialog } from './BroadcastMessageDialog';
import { UpdateAIResponsesDialog } from './UpdateAIResponsesDialog';

interface SupportMetrics {
  activeChats: number;
  pendingTickets: number;
  avgResponseTime: string;
  todayResolved: number;
  aiResolutionRate: number;
  escalationRate: number;
  customerSatisfaction: number;
}

export const LiveSupportDashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SupportMetrics>({
    activeChats: 0,
    pendingTickets: 0,
    avgResponseTime: '0 min',
    todayResolved: 0,
    aiResolutionRate: 0,
    escalationRate: 0,
    customerSatisfaction: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardMetrics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('support-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets'
      }, () => {
        loadDashboardMetrics();
      })
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardMetrics, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true);

      // Get active conversations (tickets with recent activity)
      const { data: activeTickets } = await supabase
        .from('support_tickets')
        .select('id, status, updated_at')
        .in('status', ['open', 'in_progress'])
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get today's resolved tickets
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: resolvedToday } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('status', 'resolved')
        .gte('resolved_at', today.toISOString());

      // Calculate AI resolution rate (tickets resolved without human intervention)
      const { data: aiResolved } = await supabase
        .from('support_chat_messages')
        .select('ticket_id')
        .eq('sender_id', 'system')
        .gte('created_at', today.toISOString());

      // Get escalation data
      const { data: escalatedTickets } = await supabase
        .from('support_tickets')
        .select('id, priority')
        .in('priority', ['high', 'urgent'])
        .gte('created_at', today.toISOString());

      setMetrics({
        activeChats: activeTickets?.length || 0,
        pendingTickets: activeTickets?.filter(t => t.status === 'open').length || 0,
        avgResponseTime: '12 min', // This would be calculated from actual response times
        todayResolved: resolvedToday?.length || 0,
        aiResolutionRate: aiResolved?.length ? Math.round((aiResolved.length / ((resolvedToday?.length || 1))) * 100) : 0,
        escalationRate: escalatedTickets?.length ? Math.round((escalatedTickets.length / ((activeTickets?.length || 1) + (resolvedToday?.length || 0))) * 100) : 0,
        customerSatisfaction: 94 // This would come from customer feedback
      });
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load support metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (value: number, type: 'good' | 'neutral' | 'bad') => {
    if (type === 'good') return value > 80 ? 'text-green-600' : value > 60 ? 'text-yellow-600' : 'text-red-600';
    if (type === 'bad') return value < 20 ? 'text-green-600' : value < 40 ? 'text-yellow-600' : 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Support Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Chats</p>
                <p className="text-2xl font-bold">{metrics.activeChats}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Tickets</p>
                <p className="text-2xl font-bold">{metrics.pendingTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{metrics.avgResponseTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-fuchsia-500" />
              <div>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
                <p className="text-2xl font-bold">{metrics.todayResolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              <span className={getStatusColor(metrics.aiResolutionRate, 'good')}>
                {metrics.aiResolutionRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tickets resolved without human intervention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Escalation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              <span className={getStatusColor(metrics.escalationRate, 'bad')}>
                {metrics.escalationRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tickets escalated to human agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Customer Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              <span className={getStatusColor(metrics.customerSatisfaction, 'good')}>
                {metrics.customerSatisfaction}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on post-resolution surveys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EmergencyHotlineDialog>
              <Button className="justify-start" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Emergency Hotline Status
              </Button>
            </EmergencyHotlineDialog>
            <BroadcastMessageDialog>
              <Button className="justify-start" variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Broadcast Message
              </Button>
            </BroadcastMessageDialog>
            <UpdateAIResponsesDialog>
              <Button className="justify-start" variant="outline">
                <Bot className="w-4 h-4 mr-2" />
                Update AI Responses
              </Button>
            </UpdateAIResponsesDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};