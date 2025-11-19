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
  Video,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_internal: boolean;
  sender_name?: string;
}

interface ActiveTicket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  user_id: string;
  created_at: string;
  category: string;
  unread_messages: number;
  last_message_at: string;
  client_name?: string;
}

export const AdminLiveChat = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ActiveTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Load active tickets on mount
  useEffect(() => {
    loadActiveTickets();
    
    // Set up real-time subscription for new tickets
    const ticketsChannel = supabase
      .channel('admin-tickets')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          loadActiveTickets();
          
          // Show notification for urgent tickets
          if (payload.new.priority === 'high' || payload.new.category === 'nanny_dissatisfaction') {
            toast({
              title: "🚨 Urgent Support Request",
              description: `New ${payload.new.category} ticket: ${payload.new.subject}`,
              variant: "destructive",
            });
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        (payload) => {
          loadActiveTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, []);

  // Set up real-time subscription for messages when ticket is selected
  useEffect(() => {
    if (!selectedTicket) return;

    const messagesChannel = supabase
      .channel(`ticket-messages-${selectedTicket.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_chat_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    loadTicketMessages(selectedTicket.id);

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedTicket]);

  const loadActiveTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          priority,
          status,
          user_id,
          created_at,
          category,
          description
        `)
        .in('status', ['open', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include client names and unread counts
      const ticketsWithMetadata = await Promise.all(
        data.map(async (ticket) => {
          // Get client name
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', ticket.user_id)
            .maybeSingle();

          // Get unread message count
          const { count } = await supabase
            .from('support_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)
            .eq('read_at', null)
            .neq('sender_id', user?.id);

          // Get last message timestamp
          const { data: lastMessage } = await supabase
            .from('support_chat_messages')
            .select('created_at')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const clientName = profile 
            ? `${profile.first_name} ${profile.last_name}`
            : 'Unknown Client';

          return {
            ...ticket,
            client_name: clientName,
            unread_messages: count || 0,
            last_message_at: lastMessage?.created_at || ticket.created_at
          };
        })
      );

      setActiveTickets(ticketsWithMetadata);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_chat_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('support_chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('ticket_id', ticketId)
        .neq('sender_id', user?.id)
        .is('read_at', null);

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedTicket || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_chat_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user?.id,
          message: currentMessage,
          is_internal: false
        });

      if (error) throw error;

      setCurrentMessage('');
      
      // Update ticket status to in_progress if it's open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ 
            status: 'in_progress',
            assigned_to: user?.id
          })
          .eq('id', selectedTicket.id);
      }

      toast({
        title: "Message sent",
        description: "Your response has been sent to the client",
      });

    } catch (error) {
      console.error('Error sending message:', error);
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

  const startVideoCall = async () => {
    if (!selectedTicket) return;
    
    // Get current user
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to start a video call",
        variant: "destructive",
      });
      return;
    }
    
    // Create a Jitsi Meet room
    const roomName = `nannygold-support-${selectedTicket.id}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    
    // Send meeting link to client
    try {
      console.log('Starting video call for ticket:', selectedTicket.id);
      console.log('Current user ID:', currentUser.id);
      
      const { error: insertError } = await supabase
        .from('support_chat_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: currentUser.id,
          message: `📹 Video call started! Click here to join: ${jitsiUrl}`,
          is_internal: false
        });

      if (insertError) {
        console.error('Error inserting chat message:', insertError);
        throw insertError;
      }

      // Open Jitsi in new window for admin
      window.open(jitsiUrl, '_blank');
      
      toast({
        title: "Video call started",
        description: `Meeting link sent to ${selectedTicket.client_name}. The video call will open in a new window.`,
      });
      
      console.log('Video call started successfully');
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: "Error",
        description: `Failed to start video call: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nanny_dissatisfaction': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'billing': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Active Tickets List */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Support Tickets</span>
              <Badge variant="secondary">{activeTickets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              {loadingTickets ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading tickets...
                </div>
              ) : activeTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No active tickets</p>
                  <p className="text-xs">All caught up! 🎉</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {activeTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedTicket?.id === ticket.id ? 'border-primary bg-muted/30' : ''
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(ticket.category)}
                          <Badge className={`${getPriorityColor(ticket.priority)} text-white text-xs`}>
                            {ticket.priority}
                          </Badge>
                          {ticket.unread_messages > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {ticket.unread_messages} new
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Clock className="w-3 h-3" />
                          {format(new Date(ticket.last_message_at), 'HH:mm')}
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1 line-clamp-1">
                        {ticket.subject}
                      </h4>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        Client: {ticket.client_name}
                      </p>
                      
                      {ticket.category === 'nanny_dissatisfaction' && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="font-medium">Urgent: Nanny Dissatisfaction</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedTicket ? (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>{selectedTicket.subject}</span>
                    <Badge className={`${getPriorityColor(selectedTicket.priority)} text-white`}>
                      {selectedTicket.priority}
                    </Badge>
                  </>
                ) : (
                  <span>Select a ticket to start chatting</span>
                )}
              </CardTitle>
              
              {selectedTicket && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startVideoCall}
                    className="flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Start Video Call
                  </Button>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full p-0">
            {selectedTicket ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">
                              {message.sender_id === 'system' 
                                ? 'System' 
                                : message.sender_id === user?.id 
                                  ? 'You (Admin)' 
                                  : selectedTicket.client_name
                              }
                            </span>
                            <span>{format(new Date(message.created_at), 'MMM d, HH:mm')}</span>
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
                      placeholder="Type your response..."
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
                    <span>Responding as Admin</span>
                    <span>Real-time chat • Press Enter to send</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Select a support ticket</p>
                  <p className="text-sm">Choose a ticket from the left to start helping a client</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};