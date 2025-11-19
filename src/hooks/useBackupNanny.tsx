
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';

type BackupRequest = Tables<'backup_nanny_requests'>;

export const useBackupRequests = () => {
  return useQuery({
    queryKey: ['backup-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_nanny_requests')
        .select(`
          *,
          original_booking:bookings(*),
          client:clients(*),
          backup_nanny:nannies(*)
        `)
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useRespondToBackupRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      createNewBooking = false 
    }: { 
      id: string; 
      status: 'accepted' | 'rejected';
      createNewBooking?: boolean;
    }) => {
      const { data: request, error: fetchError } = await supabase
        .from('backup_nanny_requests')
        .select(`
          *,
          original_booking:bookings(*),
          backup_nanny:nannies(*)
        `)
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the backup request status
      const { data: updatedRequest, error: updateError } = await supabase
        .from('backup_nanny_requests')
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // If accepted and createNewBooking is true, create a new booking
      if (status === 'accepted' && createNewBooking && request.original_booking) {
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            client_id: request.client_id,
            nanny_id: request.backup_nanny_id,
            status: 'confirmed',
            start_date: request.original_booking.start_date,
            end_date: request.original_booking.end_date,
            schedule: request.original_booking.schedule,
            living_arrangement: request.original_booking.living_arrangement,
            services: request.original_booking.services,
            base_rate: request.backup_nanny?.monthly_rate || 0,
            additional_services_cost: request.original_booking.additional_services_cost || 0,
            total_monthly_cost: (request.backup_nanny?.monthly_rate || 0) + (request.original_booking.additional_services_cost || 0)
          });
        
        if (bookingError) throw bookingError;
      }
      
      return updatedRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-requests'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};
