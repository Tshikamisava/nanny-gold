import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  User, 
  Bot,
  CheckCircle,
  Clock,
  Video,
  Phone,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_internal: boolean;
}

interface LiveChatEscalationProps {
  initialTicketId?: string;
  onBack?: () => void;
}

export const LiveChatEscalation = ({ initialTicketId, onBack }: LiveChatEscalationProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [ticketId, setTicketId] = useState<string | null>(initialTicketId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<string>('open');
  const [adminConnected, setAdminConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  useEffect(() => {
    if (!ticketId) {
      createSupportTicket();
    } else {
      loadTicketMessages();
      checkAdminConnection();
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    // Set up real-time subscription for new messages
    const messagesChannel = supabase
      .channel(`live-chat-${ticketId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_chat_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as ChatMessage;
          
          // Only add if it's not from the current user
          if (newMessage.sender_id !== user?.id) {
            setMessages(prev => [...prev, newMessage]);
            
            // Check if it's from admin
            if (newMessage.sender_id !== 'system') {
              setAdminConnected(true);
              setConnectionStatus('connected');
              
              if (!adminConnected) {
                toast({
                  title: "Admin Connected!",
                  description: "A support representative has joined the chat",
                });
              }
            }
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          setTicketStatus(payload.new.status);
          
          if (payload.new.status === 'in_progress' && !adminConnected) {
            setAdminConnected(true);
            setConnectionStatus('connected');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [ticketId, user?.id, adminConnected]);

  const createSupportTicket = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: 'Live Chat Support Request',
          description: 'Customer requesting immediate live chat support',
          category: 'live_chat',
          priority: 'high'
        })
        .select()
        .single();

      if (error) throw error;

      setTicketId(data.id);

      // Send initial system message
      await supabase.rpc('insert_system_chat_message', {
        p_ticket_id: data.id,
        p_message: 'Live chat session started. Connecting you with our support team...',
        p_is_internal: false
      });

      toast({
        title: "Live Chat Started",
        description: "Connecting you with our support team",
      });

    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: "Error",
        description: "Failed to start live chat session",
        variant: "destructive",
      });
    }
  };

  const loadTicketMessages = async () => {
    if (!ticketId) return;

    try {
      const { data, error } = await supabase
        .from('support_chat_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const checkAdminConnection = async () => {
    if (!ticketId) return;

    try {
      // Check if any admin has responded
      const { data, error } = await supabase
        .from('support_chat_messages')
        .select('sender_id')
        .eq('ticket_id', ticketId)
        .neq('sender_id', 'system')
        .neq('sender_id', user?.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setAdminConnected(true);
        setConnectionStatus('connected');
      } else {
        // Check ticket status
        const { data: ticketData } = await supabase
          .from('support_tickets')
          .select('status, assigned_to')
          .eq('id', ticketId)
          .single();

        if (ticketData?.status === 'in_progress' || ticketData?.assigned_to) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('connecting');
        }
      }

    } catch (error) {
      console.error('Error checking admin connection:', error);
      setConnectionStatus('offline');
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !ticketId || loading) return;

    const messageText = currentMessage;
    setCurrentMessage('');
    setLoading(true);

    // Optimistically add the message
    const tempMessage: ChatMessage = {
      id: Date.now().toString(),
      sender_id: user?.id || 'unknown',
      message: messageText,
      created_at: new Date().toISOString(),
      is_internal: false
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { error } = await supabase
        .from('support_chat_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user?.id,
          message: messageText,
          is_internal: false
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVideoCall = () => {
    if (!ticketId) return;
    
    const roomName = `nannygold-support-${ticketId}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    window.open(jitsiUrl, '_blank');
    
    // Send message about video call
    supabase
      .from('support_chat_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user?.id,
        message: `📹 Joined video call: ${jitsiUrl}`,
        is_internal: false
      });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return adminConnected ? 'Admin Online' : 'Connected';
      case 'connecting': return 'Connecting...';
      default: return 'Offline';
    }
  };

  return (
    <Card className="h-[600px] max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Live Support Chat
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
              <span className="text-sm text-muted-foreground">
                {getConnectionStatusText()}
              </span>
            </div>
            
            {adminConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={startVideoCall}
                className="flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Video Call
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col h-full p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Connecting you with support...</p>
                <p className="text-xs">Our team will be with you shortly</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {message.sender_id === 'system' 
                        ? 'System' 
                        : message.sender_id === user?.id 
                          ? 'You' 
                          : 'Support Agent'
                      }
                    </span>
                    <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                  </div>
                  <div className={`text-sm rounded-lg p-3 max-w-[80%] ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : message.sender_id === 'system'
                        ? 'bg-muted/50 text-muted-foreground border-l-4 border-blue-500'
                        : 'bg-muted/50'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Message Input */}
        <div className="p-4 border-t space-y-2">
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !currentMessage.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Press Enter to send</span>
            {ticketStatus === 'resolved' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Resolved
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};