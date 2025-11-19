import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuthContext } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { performanceMonitor } from '@/utils/performanceMonitoring';

// Types
type QueryConfig<TData> = Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>;
type MutationConfig<TData, TVariables> = Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;

// Base query hook with performance tracking and error handling
export function useBaseQuery<TData>(
  key: string[],
  fetcher: () => Promise<TData>,
  config?: QueryConfig<TData>
) {
  const { toast } = useToast();
  const startTime = performance.now();

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        const data = await fetcher();
        performanceMonitor.logMetric({
          component: 'query',
          event: key.join('.'),
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          metadata: { success: true }
        });
        return data;
      } catch (error: any) {
        performanceMonitor.logMetric({
          component: 'query',
          event: key.join('.'),
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          metadata: { error: error.message }
        });
        
        toast({
          title: 'Error fetching data',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
    ...config
  });
}

// Bookings hook with proper typing
export function useBookings(options?: QueryConfig<any>) {
  const { user } = useAuthContext();
  const userType = user?.user_metadata?.user_type || 'client';

  if (!user?.id) {
    return useBaseQuery(['bookings'], async () => [], {
      ...options,
      enabled: false
    });
  }

  return useBaseQuery(
    ['bookings', user.id],
    async () => {
      
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
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      ...options
    }
  );
}

// Base mutation hook with performance tracking
export function useBaseMutation<TData, TVariables>(
  key: string[],
  mutationFn: (variables: TVariables) => Promise<TData>,
  config?: MutationConfig<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const startTime = performance.now();
      try {
        const data = await mutationFn(variables);
        performanceMonitor.logMetric({
          component: 'mutation',
          event: key.join('.'),
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          metadata: { success: true }
        });
        return data;
      } catch (error: any) {
        performanceMonitor.logMetric({
          component: 'mutation',
          event: key.join('.'),
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          metadata: { error: error.message }
        });
        throw error;
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: key });
      if (config?.onSuccess) {
        const mutationContext = { client: queryClient, meta: {} };
        config.onSuccess(data, variables, context, mutationContext);
      }
      
      toast({
        title: 'Success',
        description: 'Operation completed successfully',
      });
    },
    onError: (error: Error, variables, context) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      if (config?.onError) {
        const mutationContext = { client: queryClient, meta: {} };
        config.onError(error, variables, context, mutationContext);
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...config
  });
}