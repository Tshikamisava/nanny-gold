import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, X, Phone, Video, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'client' | 'nanny' | 'admin';
  created_at: string;
  room_id: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
}

interface WhatsAppStyleChatProps {
  roomId: string;
  otherParticipantName: string;
  otherParticipantId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const WhatsAppStyleChat = ({ 
  roomId, 
  otherParticipantName, 
  otherParticipantId,
  isOpen, 
  onClose, 
  className = "" 
}: WhatsAppStyleChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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

    loadMessages();

    // Set up real-time subscription
    channelRef.current = supabase
      .channel(`whatsapp-chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_id !== user.id) {
            setMessages(prev => [...prev, newMessage]);
          }
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
        setMessages((data || []).map(msg => ({
          ...msg,
          sender_type: msg.sender_type as 'client' | 'nanny' | 'admin',
          message_type: msg.message_type as 'text' | 'image' | 'file' | 'system' || 'text'
        })));
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

    // Optimistic update
    const tempMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageContent,
      sender_id: user.id,
      sender_name: user.user_metadata?.first_name || 'You',
      sender_type: user.user_metadata?.user_type || 'client',
      created_at: new Date().toISOString(),
      room_id: roomId,
      message_type: 'text'
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: messageContent,
          sender_name: user.user_metadata?.first_name || 'User',
          sender_type: user.user_metadata?.user_type || 'client',
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending message:', error);
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        setNewMessage(messageContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      setNewMessage(messageContent);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const startVideoCall = () => {
    const roomName = `nannygold-chat-${roomId}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    window.open(jitsiUrl, '_blank');
    
    // Send system message
    supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user?.id,
        content: `📹 Started video call: ${jitsiUrl}`,
        sender_name: user?.user_metadata?.first_name || 'User',
        sender_type: user?.user_metadata?.user_type || 'client',
        message_type: 'system'
      });
  };

  if (!isOpen) return null;

  return (
    <Card className={`fixed right-4 bottom-4 w-96 h-[500px] shadow-xl z-50 ${className}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {getUserInitials(otherParticipantName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-medium">{otherParticipantName}</CardTitle>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Online' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={startVideoCall}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-[420px]">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      {!isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(message.sender_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground">
                            {message.sender_name}
                          </span>
                        </div>
                      )}
                      <div className={`rounded-lg px-3 py-2 ${
                        isOwnMessage 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted'
                      } ${message.message_type === 'system' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' : ''}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border-muted-foreground/20 focus:border-primary"
              disabled={!isConnected}
            />
            <Button 
              onClick={sendMessage}
              size="sm"
              disabled={!newMessage.trim() || !isConnected}
              className="px-3"
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

export default WhatsAppStyleChat;