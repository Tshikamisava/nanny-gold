import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

interface ChatMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export const useSupportTickets = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (ticketId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('support_chat_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }
  };

  const sendMessage = async (ticketId: string, message: string) => {
    try {
      const { error } = await supabase
        .from('support_chat_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          message: message.trim(),
          is_internal: false
        });

      if (error) throw error;
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to support",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createDispute = async (bookingId: string, disputeType: string, description: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .insert({
          booking_id: bookingId,
          raised_by: (await supabase.auth.getUser()).data.user?.id,
          dispute_type: disputeType,
          description: description.trim(),
          priority: 'medium'
        });

      if (error) throw error;
      
      toast({
        title: "Dispute created",
        description: "Your dispute has been submitted and will be reviewed",
      });
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast({
        title: "Error",
        description: "Failed to create dispute",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Subscribe to real-time updates for user's tickets
  useEffect(() => {
    const channel = supabase
      .channel('user-support-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    tickets,
    loading,
    loadTickets, // Export loadTickets for manual refresh
    loadChatMessages,
    sendMessage,
    createDispute
  };
};