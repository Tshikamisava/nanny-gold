
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuthContext } from '@/components/AuthProvider';
import { useMatchingNannies } from '@/hooks/useNannies';

type Booking = Tables<'bookings'>;
type BookingInsert = TablesInsert<'bookings'>;
type BookingUpdate = TablesUpdate<'bookings'>;

export type BookingWithNanny = Booking & {
  nannies: Tables<'nannies'> & {
    profiles: Tables<'profiles'>;
  };
  clients: Tables<'clients'>;
};

export const useBookings = () => {
  const { user } = useAuthContext();
  const userType = user?.user_metadata?.user_type || 'client';
  
  console.log('useBookings - User ID:', user?.id, 'User Type:', userType);
  
  const { data: bookings, isLoading: bookingsLoading, error, refetch } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('useBookings - No user ID, returning empty array');
        return [];
      }
      
      console.log('useBookings - Fetching bookings for:', user.id);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          nannies!bookings_nanny_id_fkey (
            *,
            profiles!nannies_id_fkey (*)
          ),
          clients!bookings_client_id_fkey (
            *,
            profiles!clients_id_fkey (*)
          )
        `)
        .eq(userType === 'client' ? 'client_id' : 'nanny_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('useBookings - Query error:', error);
        throw error;
      }
      
      console.log('useBookings - Fetched bookings count:', data?.length || 0);
      return data as BookingWithNanny[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  console.log('useBookings - Returning bookings count:', bookings?.length || 0);
  return { data: bookings || [], isLoading: bookingsLoading, error, refetch };
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: BookingInsert) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useUpdateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BookingUpdate }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};
