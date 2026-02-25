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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const formattedRooms: ChatRoom[] = (data || []).map((room: any) => ({
        room_id: room.id,
        room_type: room.room_type || 'client_admin',
        room_name: room.room_name || 'Support Chat',
        other_participant_id: room.participant_1 === user.id ? room.participant_2 : room.participant_1,
        other_participant_name: room.participant_1 === user.id ? (room.participant_2_name || 'Support') : (room.participant_1_name || 'Support'),
        last_message: room.last_message || '',
        last_message_at: room.last_message_at || room.created_at,
        unread_count: room.unread_count || 0,
      }));

      setRooms(formattedRooms);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrGetChatRoom = async (
    otherUserId: string, 
    roomType: 'client_admin' | 'client_nanny' = 'client_nanny'
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check for existing room
      const { data: existing, error: findError } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .eq('room_type', roomType)
        .maybeSingle();

      if (findError) throw findError;
      if (existing) return existing.id;

      // Create new room
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
          room_type: roomType,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      return newRoom?.id || null;
    } catch (error) {
      console.error('Error creating/getting chat room:', error);
      toast({
        title: "Chat Error",
        description: "Unable to open chat. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const markRoomAsRead = async (roomId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('room_id', roomId)
        .neq('sender_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  // Real-time subscription for chat room updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-rooms-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        () => {
          loadChatRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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