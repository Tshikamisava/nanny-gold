import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface UseBookingRealtimeOptions {
  enabled?: boolean;
  onBookingUpdate?: (payload: any) => void;
  onBookingInsert?: (payload: any) => void;
  onBookingDelete?: (payload: any) => void;
}

export const useBookingRealtime = (options: UseBookingRealtimeOptions = {}) => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    enabled = true,
    onBookingUpdate,
    onBookingInsert,
    onBookingDelete
  } = options;

  const handleBookingChange = useCallback((payload: any) => {
    console.log('🔄 Real-time booking change:', payload);

    // Invalidate and refetch booking queries
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });

    // Show toast notification for relevant changes
    if (payload.eventType === 'INSERT') {
      if (payload.new.client_id === user?.id) {
        toast({
          title: "New Booking",
          description: "Your booking request has been submitted successfully!",
          variant: "default"
        });
      }
      onBookingInsert?.(payload);
    } else if (payload.eventType === 'UPDATE') {
      const oldStatus = payload.old?.status;
      const newStatus = payload.new?.status;

      // Notify about status changes
      if (oldStatus !== newStatus) {
        if (payload.new.client_id === user?.id) {
          let message = '';
          switch (newStatus) {
            case 'confirmed':
              message = 'Your booking has been confirmed!';
              break;
            case 'in_progress':
              message = 'Your booking is now in progress!';
              break;
            case 'completed':
              message = 'Your booking has been completed!';
              break;
            case 'cancelled':
              message = 'Your booking has been cancelled.';
              break;
            default:
              message = `Booking status updated to ${newStatus}`;
          }
          toast({
            title: "Booking Update",
            description: message,
            variant: newStatus === 'cancelled' ? 'destructive' : 'default'
          });
        } else if (payload.new.nanny_id === user?.id) {
          let message = '';
          switch (newStatus) {
            case 'confirmed':
              message = 'You have a new confirmed booking!';
              break;
            case 'in_progress':
              message = 'Your booking is now in progress!';
              break;
            case 'completed':
              message = 'Your booking has been completed!';
              break;
            case 'cancelled':
              message = 'A booking has been cancelled.';
              break;
            default:
              message = `Booking status updated to ${newStatus}`;
          }
          toast({
            title: "Booking Update",
            description: message,
            variant: newStatus === 'cancelled' ? 'destructive' : 'default'
          });
        }
      }
      onBookingUpdate?.(payload);
    } else if (payload.eventType === 'DELETE') {
      toast({
        title: "Booking Removed",
        description: "A booking has been removed.",
        variant: "destructive"
      });
      onBookingDelete?.(payload);
    }
  }, [user?.id, queryClient, toast, onBookingUpdate, onBookingInsert, onBookingDelete]);

  useEffect(() => {
    if (!user?.id || !enabled) return;

    console.log('📡 Setting up real-time booking subscriptions for user:', user.id);

    // Subscribe to bookings where user is client
    const clientBookingsChannel = supabase
      .channel(`bookings-client-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `client_id=eq.${user.id}`
        },
        handleBookingChange
      )
      .subscribe();

    // Subscribe to bookings where user is nanny
    const nannyBookingsChannel = supabase
      .channel(`bookings-nanny-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `nanny_id=eq.${user.id}`
        },
        handleBookingChange
      )
      .subscribe();

    // Subscribe to all bookings for admin users
    let adminBookingsChannel: any = null;
    if (user.user_metadata?.user_type === 'admin') {
      adminBookingsChannel = supabase
        .channel(`bookings-admin-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings'
          },
          handleBookingChange
        )
        .subscribe();
    }

    return () => {
      console.log('🔌 Cleaning up booking real-time subscriptions');
      clientBookingsChannel.unsubscribe();
      nannyBookingsChannel.unsubscribe();
      if (adminBookingsChannel) {
        adminBookingsChannel.unsubscribe();
      }
    };
  }, [user?.id, user?.user_metadata?.user_type, enabled, handleBookingChange]);

  return {
    isConnected: true // Could add connection status tracking if needed
  };
};