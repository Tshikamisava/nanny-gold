import { useState } from 'react';
import { useChatRooms } from './useChatRooms';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useAdminEscalation = () => {
  const [isEscalating, setIsEscalating] = useState(false);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<{id: string, name: string} | null>(null);
  const { createOrGetChatRoom } = useChatRooms();
  const { user } = useAuth();
  const { toast } = useToast();

  const escalateToAdmin = async (): Promise<string | null> => {
    if (!user || isEscalating) {
      return null;
    }

    try {
      setIsEscalating(true);

      // Get a random available admin
      const { data: adminRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (roleError || !adminRoles || adminRoles.length === 0) {
        toast({
          title: "No Admin Available",
          description: "All admins are currently busy. Please try again later.",
          variant: "destructive"
        });
        return null;
      }

      const adminId = adminRoles[0].user_id;

      // Get admin profile info
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', adminId)
        .single();

      const adminName = adminProfile 
        ? `${adminProfile.first_name || 'Admin'} ${adminProfile.last_name || 'Angel'}`
        : 'Admin Angel';
      
      // Store admin info
      setAdminInfo({ id: adminId, name: adminName });
      
      // Create or get chat room with admin
      const roomId = await createOrGetChatRoom(adminId, 'client_admin');
      
      if (roomId) {
        setActiveChatRoomId(roomId);
        toast({
          title: "Connected to Admin Angel",
          description: "You're now connected with our support team. They'll respond shortly.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to create chat room. Please try again.",
          variant: "destructive"
        });
      }

      return roomId;
    } catch (error) {
      console.error('Error escalating to admin:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect with admin. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsEscalating(false);
    }
  };

  return {
    escalateToAdmin,
    isEscalating,
    activeChatRoomId,
    setActiveChatRoomId,
    adminInfo
  };
};