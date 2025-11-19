import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';

type QueryConfig<TData> = Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>;
type MutationConfig<TData, TVariables> = Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;

export function useOptimizedQuery<TData>(
  key: string[],
  fetcher: () => Promise<TData>,
  config?: QueryConfig<TData>
) {
  const { toast } = useToast();

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await fetcher();
      } catch (error: any) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 404s or auth errors
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
    ...config
  });
}

export function useOptimizedMutation<TData, TVariables>(
  key: string[],
  mutationFn: (variables: TVariables) => Promise<TData>,
  config?: MutationConfig<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables);
      } catch (error: any) {
        toast({
          title: "Error updating data",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: key });
      
      toast({
        title: "Success",
        description: "Operation completed successfully",
      });
      
      config?.onSuccess?.(data, variables, null as any);
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...config,
  });
}

// Example usage for bookings
export function useBookings(options?: QueryConfig<any>) {
  const { user } = useAuthContext();
  
  return useOptimizedQuery(
    ['bookings', user?.id],
    async () => {
      if (!user?.id) return [];
      
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
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    {
      staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
      ...options
    }
  );
}