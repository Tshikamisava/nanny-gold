import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';


export const useBookingReassignments = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['booking-reassignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('booking_reassignments')
        .select(`
          *,
          bookings:original_booking_id (
            *,
            nannies:nanny_id (
              id,
              profiles:id (first_name, last_name)
            )
          )
        `)
        .eq('client_id', user.id)
        .eq('client_response', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useRespondToReassignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      reassignmentId, 
      response, 
      selectedNannyId 
    }: { 
      reassignmentId: string; 
      response: 'accepted' | 'rejected'; 
      selectedNannyId?: string;
    }) => {
      // Update reassignment response
      const { error } = await supabase
        .from('booking_reassignments')
        .update({
          client_response: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', reassignmentId);
      
      if (error) throw error;
      
      // If client selected a different nanny from alternatives
      if (response === 'accepted' && selectedNannyId) {
        const { data: reassignment } = await supabase
          .from('booking_reassignments')
          .select('original_booking_id, new_nanny_id')
          .eq('id', reassignmentId)
          .single();
        
        if (reassignment && selectedNannyId !== reassignment.new_nanny_id) {
          // Update booking with selected nanny
          await supabase
            .from('bookings')
            .update({ nanny_id: selectedNannyId })
            .eq('id', reassignment.original_booking_id);
          
          // Update reassignment record
          await supabase
            .from('booking_reassignments')
            .update({ new_nanny_id: selectedNannyId })
            .eq('id', reassignmentId);
        }
      }
      
      // If rejected, escalate to admin
      if (response === 'rejected') {
        await supabase.functions.invoke('escalate-booking-issue', {
          body: {
            reassignmentId,
            reason: 'client_rejected_reassignment'
          }
        });
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-reassignments'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useEscalateBooking = () => {
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('escalate-booking-issue', {
        body: { bookingId, reason }
      });
      
      if (error) throw error;
      return data;
    }
  });
};