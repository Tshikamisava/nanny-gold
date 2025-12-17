
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuthContext } from '@/components/AuthProvider';
import { useMatchingNannies } from '@/hooks/useNannies';
import { validateStoredBooking } from '@/utils/bookingValidation';
import { useBookingRealtime } from './useBookingRealtime';

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

  // Enable real-time booking updates
  useBookingRealtime();

  console.log('useBookings - User ID:', user?.id, 'User Type:', userType);
  
  const { data: bookings, isLoading: bookingsLoading, error, refetch } = useQuery({
    queryKey: ['bookings', user?.id, userType],
    queryFn: async () => {
      if (!user?.id) {
        console.log('useBookings - No user ID, returning empty array');
        return [];
      }
      
      console.log('useBookings - Fetching bookings for:', user.id, 'Type:', userType);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          nannies!bookings_nanny_id_fkey (
            *,
            profiles!nannies_id_fkey (
              id,
              first_name,
              last_name,
              phone,
              email
            )
          ),
          clients!bookings_client_id_fkey (
            *,
            profiles!clients_id_fkey (
              id,
              first_name,
              last_name,
              phone,
              email
            )
          )
        `)
        .eq(userType === 'client' ? 'client_id' : 'nanny_id', user.id)
        .order('start_date', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('useBookings - Query error:', error);
        throw error;
      }
      
      // ✅ Validate booking data completeness and log issues
      const validatedBookings = (data || []).map(booking => {
        const validation = validateStoredBooking(booking);
        
        if (!validation.isValid) {
          console.error(`❌ Invalid booking ${booking.id}:`, validation.errors);
        }
        
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ Booking ${booking.id} warnings:`, validation.warnings);
        }
        
        if (validation.missingFields.length > 0) {
          console.warn(`📋 Booking ${booking.id} missing fields:`, validation.missingFields);
        }
        
        return booking;
      });
      
      console.log('useBookings - Fetched and validated bookings:', validatedBookings.length);
      return validatedBookings as BookingWithNanny[];
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // Reduced to 1 minute for fresher data
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to window
    refetchOnReconnect: true, // Refresh when connection restored
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
