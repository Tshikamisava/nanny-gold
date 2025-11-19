import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  User, 
  Users,
  Clock,
  CheckCircle,
  Search,
  Plus
} from 'lucide-react';
import { useAuthContext } from '@/components/AuthProvider';
import { format } from 'date-fns';

interface ChatRoom {
  room_id: string;
  room_type: string;
  room_name: string;
  other_participant_id: string;
  other_participant_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_type: string;
  created_at: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
}

export const AdminChatRooms = () => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load chat rooms on mount
  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  // Set up real-time subscription for messages when room is selected
  useEffect(() => {
    if (!selectedRoom) return;

    const messagesChannel = supabase
      .channel(`chat-messages-${selectedRoom.room_id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom.room_id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    loadRoomMessages(selectedRoom.room_id);

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedRoom]);

  const loadChatRooms = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_chat_rooms', {
        user_id_param: user?.id
      });

      if (error) throw error;
      setChatRooms(data || []);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load chat rooms",
        variant: "destructive",
      });
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadRoomMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_chat_messages', {
        room_id_param: roomId
      });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('chat_room_participants')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user?.id);

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedRoom || loading) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      const senderName = profile ? `${profile.first_name} ${profile.last_name}` : 'Admin';

      const { error } = await supabase.rpc('send_chat_message', {
        room_id_param: selectedRoom.room_id,
        content_param: currentMessage,
        sender_name_param: senderName,
        sender_type_param: 'admin'
      });

      if (error) throw error;

      setCurrentMessage('');
      
      toast({
        title: "Message sent",
        description: "Your message has been sent",
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

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all users who are not admins  
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          user_type
        `)
        .in('user_type', ['client', 'nanny'])
        .order('first_name');

      if (error) {
        throw error;
      }
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const startNewChat = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_or_create_chat_room', {
        participant1_id: user?.id,
        participant2_id: selectedUser,
        room_type: 'client_admin'
      });

      if (error) throw error;

      // Reload chat rooms and select the new one
      await loadChatRooms();
      const newRoom = chatRooms.find(room => room.room_id === data);
      if (newRoom) {
        setSelectedRoom(newRoom);
      }

      setShowNewChatDialog(false);
      setSelectedUser('');
      
      toast({
        title: "Chat started",
        description: "You can now message this user",
      });

    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = chatRooms.filter(room =>
    room.other_participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clientRooms = filteredRooms.filter(room => room.room_type === 'client_admin');
  const nannyRooms = filteredRooms.filter(room => room.room_type === 'nanny_admin');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
      {/* Chat Rooms List */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Chat Rooms</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{chatRooms.length}</Badge>
                <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowNewChatDialog(true);
                        loadAvailableUsers();
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      New Chat
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start New Chat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Select User</label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingUsers ? "Loading users..." : "Choose a client or nanny"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.length === 0 && !loadingUsers ? (
                              <div className="p-2 text-sm text-muted-foreground">No users found</div>
                            ) : (
                              availableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    {user.user_type === 'client' ? (
                                      <User className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <Users className="w-4 h-4 text-green-500" />
                                    )}
                                    {user.first_name} {user.last_name}
                                    <Badge variant="outline" className="text-xs">
                                      {user.user_type}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewChatDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={startNewChat}
                          disabled={!selectedUser || loading}
                        >
                          {loading ? 'Starting...' : 'Start Chat'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="clients" className="h-[calc(100vh-16rem)] flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 mb-2 flex-shrink-0">
                <TabsTrigger value="clients" className="flex items-center gap-1 text-xs">
                  <User className="w-3 h-3" />
                  <span className="hidden sm:inline">Clients</span> ({clientRooms.length})
                </TabsTrigger>
                <TabsTrigger value="nannies" className="flex items-center gap-1 text-xs">
                  <Users className="w-3 h-3" />
                  <span className="hidden sm:inline">Nannies</span> ({nannyRooms.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="clients" className="h-full mt-0">
                <ScrollArea className="h-full">
                  {loadingRooms ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading chats...
                    </div>
                  ) : clientRooms.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No client chats</p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {clientRooms.map((room) => (
                        <div
                          key={room.room_id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedRoom?.room_id === room.room_id ? 'border-primary bg-muted/30' : ''
                          }`}
                          onClick={() => setSelectedRoom(room)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-500" />
                              {room.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {room.unread_count}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Clock className="w-3 h-3" />
                              {room.last_message_at && format(new Date(room.last_message_at), 'HH:mm')}
                            </div>
                          </div>
                          
                          <h4 className="font-medium text-sm mb-1 truncate">
                            {room.other_participant_name}
                          </h4>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                            {room.last_message || 'No messages yet'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="nannies" className="h-full mt-0">
                <ScrollArea className="h-full">
                  {nannyRooms.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No nanny chats</p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {nannyRooms.map((room) => (
                        <div
                          key={room.room_id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedRoom?.room_id === room.room_id ? 'border-primary bg-muted/30' : ''
                          }`}
                          onClick={() => setSelectedRoom(room)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-green-500" />
                              {room.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {room.unread_count}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Clock className="w-3 h-3" />
                              {room.last_message_at && format(new Date(room.last_message_at), 'HH:mm')}
                            </div>
                          </div>
                          
                          <h4 className="font-medium text-sm mb-1 truncate">
                            {room.other_participant_name}
                          </h4>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                            {room.last_message || 'No messages yet'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedRoom ? (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>{selectedRoom.other_participant_name}</span>
                    <Badge variant="outline">
                      {selectedRoom.room_type === 'client_admin' ? 'Client' : 'Nanny'}
                    </Badge>
                  </>
                ) : (
                  <span>Select a chat to start messaging</span>
                )}
              </CardTitle>
              
              {selectedRoom && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full p-0">
            {selectedRoom ? (
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
                              {message.sender_id === user?.id 
                                ? 'You (Admin)' 
                                : message.sender_name
                              }
                            </span>
                            <span>{format(new Date(message.created_at), 'MMM d, HH:mm')}</span>
                          </div>
                          <div className={`text-sm rounded-lg p-3 max-w-[80%] ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted/50'
                          }`}>
                            <div className="whitespace-pre-wrap">{message.content}</div>
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
                    <span>Messaging as Admin</span>
                    <span>Real-time chat • Press Enter to send</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Select a chat room</p>
                  <p className="text-sm">Choose a conversation from the left to start messaging</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};