import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Calendar, 
  Users, 
  HelpCircle,
  Bell,
  Clock,
  Plus,
  Search,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useToast } from '@/hooks/use-toast';
import RealtimeChat from '@/components/RealtimeChat';
import { NannySupportDialog } from '@/components/NannySupportDialog';
import { Input } from '@/components/ui/input';

interface ChatRoom {
  room_id: string;
  room_type: string;
  room_name: string;
  other_participant_id: string;
  other_participant_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  booking_status?: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  created_at: string;
  assigned_to: string | null;
}

export default function NannyMessages() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('messages');
  
  // Chat state
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Support tickets state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadChatRooms();
      loadSupportTickets();
    }
  }, [user]);

  const loadChatRooms = async () => {
    if (!user) return;
    
    try {
      // Use the booking-validated function for nannies to only show valid chats
      const { data, error } = await supabase.rpc('get_nanny_chat_rooms_with_booking_validation', {
        nanny_id_param: user.id
      });

      if (error) throw error;
      setChatRooms(data || []);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load chat rooms",
        variant: "destructive"
      });
    } finally {
      setLoadingChats(false);
    }
  };

  const loadSupportTickets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupportTickets(data || []);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      toast({
        title: "Error", 
        description: "Failed to load support tickets",
        variant: "destructive"
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const filteredChatRooms = chatRooms.filter(room =>
    room.room_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.other_participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleTicketCreated = () => {
    setShowTicketDialog(false);
    loadSupportTickets();
  };

  const createAdminSupportRoom = async () => {
    if (!user) return;
    
    try {
      console.log('Creating admin support room for user:', user.id);
      
      // Call the edge function to create admin support room
      const { data, error } = await supabase.functions.invoke('create-admin-support-room', {
        body: { user_id: user.id }
      });
      
      console.log('Edge function response:', { data, error });
      
      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      // Reload chat rooms to show the new admin room
      await loadChatRooms();
      
      // Select the newly created room if provided
      if (data?.room_id) {
        console.log('Setting selected room ID:', data.room_id);
        setSelectedRoomId(data.room_id);
      }
      
      toast({
        title: "Admin chat ready",
        description: "You can now message admins directly",
      });
    } catch (error) {
      console.error('Error creating admin support room:', error);
      toast({
        title: "Error",
        description: "Failed to create admin chat. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Please log in to access messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Messages & Support</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Chat with clients and admins, or get help with support tickets
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages" className="flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
            <MessageCircle className="w-4 h-4" />
            Messages (Coming Soon)
            {chatRooms.some(room => room.unread_count > 0) && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {chatRooms.reduce((sum, room) => sum + room.unread_count, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Support
            {supportTickets.filter(t => t.status === 'open').length > 0 && (
              <Badge variant="default" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {supportTickets.filter(t => t.status === 'open').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card className="h-[600px] flex items-center justify-center">
            <div className="text-center p-8">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Chat Feature Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                Direct messaging with clients will be available after launch. For now, please use support tickets to contact admin.
              </p>
              <Button 
                onClick={() => {
                  const subject = encodeURIComponent("Support Request from Nanny");
                  const body = encodeURIComponent(`Dear NannyGold Support Team,

I need assistance with:
- 

Please describe your issue in detail above this line.

---
Nanny ID: ${user?.id}
Date: ${new Date().toLocaleString()}`);
                  window.location.href = `mailto:care@nannygold.co.za?subject=${subject}&body=${body}`;
                }}
                variant="outline"
              >
                Email Support Team
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Support Tickets</h3>
              <p className="text-sm text-muted-foreground">
                Get help with your account, bookings, or any other issues
              </p>
            </div>
            <Button onClick={() => setShowTicketDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : supportTickets.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No support tickets yet</p>
                  <p className="text-sm text-muted-foreground">
                    Click "New Ticket" to get help with any issues
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{ticket.subject}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Category: {ticket.category}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge variant={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NannySupportDialog
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
}