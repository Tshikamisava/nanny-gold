import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ChatRoom {
  room_id: string;
  room_type: 'client_admin' | 'client_nanny' | 'group';
  room_name: string;
  other_participant_id: string;
  other_participant_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export const useChatRooms = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadChatRooms = async () => {
    // Chat functionality disabled for launch
    console.log('Chat rooms loading disabled - feature coming soon');
    setLoading(false);
    return;
  };

  const createOrGetChatRoom = async (
    otherUserId: string, 
    roomType: 'client_admin' | 'client_nanny' = 'client_nanny'
  ): Promise<string | null> => {
    // Chat functionality disabled for launch
    console.log('Chat room creation disabled - feature coming soon');
    toast({
      title: "Chat Feature Coming Soon",
      description: "Direct messaging will be available after launch. Please use email support for now.",
      variant: "default"
    });
    return null;
  };

  const markRoomAsRead = async (roomId: string) => {
    // Chat functionality disabled for launch
    console.log('Mark as read disabled - feature coming soon');
    return;
  };

  // Chat functionality disabled - no need to load on user change
  useEffect(() => {
    console.log('Chat rooms loading disabled for launch');
  }, [user]);

  // Chat functionality disabled - no real-time subscriptions needed
  useEffect(() => {
    console.log('Chat subscriptions disabled for launch');
    return () => {
      console.log('Chat subscriptions cleanup disabled for launch');
    };
  }, [user]);

  return {
    rooms,
    loading,
    loadChatRooms,
    createOrGetChatRoom,
    markRoomAsRead
  };
};