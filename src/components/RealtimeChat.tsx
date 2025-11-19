import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'client' | 'nanny' | 'admin';
  timestamp: string;
  room_id: string;
}

interface RealtimeChatProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const RealtimeChat = ({ roomId, isOpen, onClose, className = "" }: RealtimeChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !user) return;

    // Load existing messages
    loadMessages();

    // Set up real-time subscription
    channelRef.current = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          toast({
            title: "Connection Error",
            description: "Failed to connect to chat. Please refresh.",
            variant: "destructive"
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, roomId, user, toast]);

  const loadMessages = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Failed to load chat messages",
          variant: "destructive"
        });
      } else {
        // Map the returned data to our Message interface
        const formattedMessages = (data || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          sender_type: msg.sender_type,
          timestamp: msg.created_at,
          room_id: msg.room_id
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Insert message directly into database
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: messageContent,
          sender_name: user.user_metadata?.first_name || 'User',
          sender_type: user.user_metadata?.user_type || 'client'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        setNewMessage(messageContent); // Restore message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      setNewMessage(messageContent); // Restore message
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'nanny': return 'bg-green-100 text-green-800';
      case 'client': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <Card className={`fixed right-4 bottom-4 w-80 h-96 shadow-lg z-50 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Interview Chat
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Secure end-to-end encrypted messaging
        </p>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-80">
        <ScrollArea className="flex-1 p-3">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(message.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium truncate">
                        {message.sender_name}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-1 py-0 ${getUserTypeColor(message.sender_type)}`}
                      >
                        {message.sender_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm bg-gray-50 rounded-lg px-2 py-1">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 text-sm"
              disabled={!isConnected}
            />
            <Button 
              onClick={sendMessage}
              size="sm"
              disabled={!newMessage.trim() || !isConnected}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!isConnected && (
            <p className="text-xs text-red-500 mt-1">
              Disconnected - messages may not be delivered
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeChat;