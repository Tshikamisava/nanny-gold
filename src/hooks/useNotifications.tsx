
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

type Notification = Tables<'notifications'>;

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Show toast for new notifications
          if (payload.eventType === 'INSERT') {
            const notification = payload.new;
            toast({
              title: "New Notification",
              description: notification.message || "You have a new notification",
              variant: "default"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return query;
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(['notifications']);

      // Optimistically update to the new value
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return old.filter((notification: any) => notification.id !== deletedId);
      });

      // Return a context object with the snapshotted value
      return { previousNotifications };
    },
    onError: (err, deletedId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};
