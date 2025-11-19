import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, Plus, Video, Phone } from 'lucide-react';
import { useChatRooms } from '@/hooks/useChatRooms';
import WhatsAppStyleChat from './WhatsAppStyleChat';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatRoomsListProps {
  className?: string;
}

const ChatRoomsList = ({ className = "" }: ChatRoomsListProps) => {
  const { rooms, loading, createOrGetChatRoom, markRoomAsRead } = useChatRooms();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedRoomData, setSelectedRoomData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter(room => 
    room.room_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleRoomSelect = async (room: any) => {
    setSelectedRoom(room.room_id);
    setSelectedRoomData(room);
    
    // Mark room as read
    if (room.unread_count > 0) {
      await markRoomAsRead(room.room_id);
    }
  };

  const getRoomTypeIcon = (roomType: string) => {
    switch (roomType) {
      case 'client_admin':
        return '👨‍💼';
      case 'client_nanny':
        return '👩‍👧‍👦';
      default:
        return '💬';
    }
  };

  const getRoomTypeColor = (roomType: string) => {
    switch (roomType) {
      case 'client_admin':
        return 'bg-blue-100 text-blue-800';
      case 'client_nanny':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <MessageCircle className="w-5 h-5" />
          Messages (Coming Soon)
        </CardTitle>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium mb-2 text-muted-foreground">Chat Feature Coming Soon</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Direct messaging will be available after launch. For now, please use email support.
        </p>
        <Button 
          onClick={() => {
            const subject = encodeURIComponent("Support Request from Client");
            const body = encodeURIComponent(`Dear NannyGold Support Team,

I need assistance with:
- 

Please describe your issue in detail above this line.

---
Date: ${new Date().toLocaleString()}`);
            window.location.href = `mailto:care@nannygold.co.za?subject=${subject}&body=${body}`;
          }}
          variant="outline"
          size="sm"
        >
          Email Support Team
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChatRoomsList;