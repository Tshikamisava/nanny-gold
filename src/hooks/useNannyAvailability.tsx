import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { addDays, format, startOfWeek, endOfWeek } from 'date-fns';

export interface NannyAvailability {
  id: string;
  nanny_id: string;
  available_dates: string[];
  unavailable_dates: string[];
  schedule: any;
  time_slots: any[];
  recurring_schedule: any;
  emergency_available: boolean;
  advance_notice_days: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  date_available: string;
  available_slots: any;
  blocked_slots: any;
  has_bookings: boolean;
  has_interviews: boolean;
}

// Hook to get nanny's availability data
export const useNannyAvailability = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['nanny-availability', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('nanny_availability')
        .select('*')
        .eq('nanny_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as NannyAvailability | null;
    },
    enabled: !!user?.id,
  });
};

// Hook to get availability for a date range
export const useAvailabilityRange = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['availability-range', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase.rpc('get_nanny_availability', {
        p_nanny_id: user.id,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd')
      });
      
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!user?.id,
  });
};

// Hook to update availability
export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<NannyAvailability>) => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('nanny_availability')
        .upsert({
          nanny_id: user.id,
          ...updates,
          emergency_available: true, // Force emergency availability for all nannies
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nanny-availability'] });
      queryClient.invalidateQueries({ queryKey: ['availability-range'] });
      toast.success('Availability updated successfully');
    },
    onError: (error) => {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    },
  });
};

// Hook to block specific dates/times
export const useBlockTime = () => {
  const updateAvailability = useUpdateAvailability();
  const { data: currentAvailability } = useNannyAvailability();
  
  return useMutation({
    mutationFn: async ({ 
      dates, 
      hours, 
      isFullDay = false 
    }: { 
      dates: string[]; 
      hours?: number[]; 
      isFullDay?: boolean; 
    }) => {
      // Check 7-day advance notice rule
      const minDate = addDays(new Date(), 7);
      const invalidDates = dates.filter(date => new Date(date) < minDate);
      
      if (invalidDates.length > 0) {
        throw new Error('Cannot block dates less than 7 days in advance');
      }
      
      const currentUnavailable = currentAvailability?.unavailable_dates || [];
      const currentTimeSlots = currentAvailability?.time_slots || [];
      
      if (isFullDay) {
        // Block entire days
        const newUnavailableDates = [...new Set([...currentUnavailable, ...dates])];
        
        return updateAvailability.mutateAsync({
          unavailable_dates: newUnavailableDates
        });
      } else {
        // Block specific hours
        const updatedTimeSlots = [...currentTimeSlots];
        
        dates.forEach(date => {
          const existingSlot = updatedTimeSlots.find(slot => slot.date === date);
          if (existingSlot) {
            existingSlot.blocked_hours = [...new Set([...(existingSlot.blocked_hours || []), ...(hours || [])])];
          } else {
            updatedTimeSlots.push({
              date,
              blocked_hours: hours || [],
              available_hours: []
            });
          }
        });
        
        return updateAvailability.mutateAsync({
          time_slots: updatedTimeSlots
        });
      }
    },
    onSuccess: () => {
      toast.success('Time blocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to block time');
    },
  });
};

// Hook to set recurring availability
export const useSetRecurringAvailability = () => {
  const updateAvailability = useUpdateAvailability();
  
  return useMutation({
    mutationFn: async (schedule: {
      monday?: { available: boolean; hours: { start: string; end: string }[] };
      tuesday?: { available: boolean; hours: { start: string; end: string }[] };
      wednesday?: { available: boolean; hours: { start: string; end: string }[] };
      thursday?: { available: boolean; hours: { start: string; end: string }[] };
      friday?: { available: boolean; hours: { start: string; end: string }[] };
      saturday?: { available: boolean; hours: { start: string; end: string }[] };
      sunday?: { available: boolean; hours: { start: string; end: string }[] };
    }) => {
      return updateAvailability.mutateAsync({
        recurring_schedule: schedule,
        emergency_available: true // Always set to true for all nannies
      });
    },
    onSuccess: () => {
      toast.success('Recurring schedule updated');
    },
  });
};

// Hook to check for booking conflicts
export const useCheckConflicts = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
      startTime,
      endTime
    }: {
      startDate: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
    }) => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase.rpc('check_booking_conflicts', {
        p_nanny_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_start_time: startTime,
        p_end_time: endTime
      });
      
      if (error) throw error;
      return data as boolean;
    },
  });
};