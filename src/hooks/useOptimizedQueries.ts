import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { performanceMonitor } from '@/utils/performanceMonitoring';

interface PrefetchOptions {
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
}

export function useOptimizedQueries() {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const lastPrefetchTime = useRef<Record<string, number>>({});

  // Define common query patterns for prefetching
  const queryPatterns = {
    '/dashboard': ['clientProfile', 'activeBookings', 'upcomingInterviews'],
    '/client/calendar': ['monthlyBookings', 'availableSlots'],
    '/nanny': ['nannyProfile', 'scheduledBookings'],
    '/admin': ['systemStats', 'pendingApprovals']
  };

  const prefetchData = useCallback(async (
    queryKey: string | string[],
    fetcher: () => Promise<any>,
    options: PrefetchOptions = {}
  ) => {
    const start = performance.now();
    const key = Array.isArray(queryKey) ? queryKey.join('.') : queryKey;
    
    try {
      // Check if we need to prefetch (default 30s cooldown)
      const now = Date.now();
      const lastFetch = lastPrefetchTime.current[key] || 0;
      if (now - lastFetch < (options.staleTime || 30000)) {
        return;
      }

      // Start prefetching
      await queryClient.prefetchQuery({
        queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        queryFn: fetcher,
        staleTime: options.staleTime || 30000,
        gcTime: options.gcTime || 5 * 60000,
        retry: false
      });

      lastPrefetchTime.current[key] = now;

      // Track performance
      const duration = performance.now() - start;
      performanceMonitor.logMetric({
        component: 'useOptimizedQueries',
        event: 'prefetch',
        duration,
        timestamp: Date.now(),
        metadata: { queryKey, success: true }
      });
    } catch (error) {
      performanceMonitor.logMetric({
        component: 'useOptimizedQueries',
        event: 'prefetch-error',
        duration: performance.now() - start,
        timestamp: Date.now(),
        metadata: { queryKey, error }
      });
    }
  }, [queryClient]);

  // Auto-prefetch data based on current route
  useEffect(() => {
    const patterns = Object.entries(queryPatterns);
    const currentPatternIndex = patterns.findIndex(([path]) => 
      pathname.startsWith(path)
    );

    if (currentPatternIndex !== -1) {
      // Prefetch next route's data
      const nextPattern = patterns[currentPatternIndex + 1];
      if (nextPattern) {
        const [, queries] = nextPattern;
        queries.forEach(query => {
          prefetchData(query, () => Promise.resolve(null), {
            enabled: false // Just prime the cache
          });
        });
      }
    }
  }, [pathname, prefetchData]);

  const optimizeQuery = useCallback(<T,>(
    queryKey: string | string[],
    fetcher: () => Promise<T>,
    options: PrefetchOptions = {}
  ) => {
    return {
      queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
      queryFn: async () => {
        const start = performance.now();
        try {
          const data = await fetcher();
          
          performanceMonitor.logMetric({
            component: 'useOptimizedQueries',
            event: 'query',
            duration: performance.now() - start,
            timestamp: Date.now(),
            metadata: { queryKey, success: true }
          });

          return data;
        } catch (error) {
          performanceMonitor.logMetric({
            component: 'useOptimizedQueries',
            event: 'query-error',
            duration: performance.now() - start,
            timestamp: Date.now(),
            metadata: { queryKey, error }
          });
          throw error;
        }
      },
      staleTime: options.staleTime || 30000,
      gcTime: options.gcTime || 5 * 60000,
      retry: false,
      ...options
    };
  }, []);

  return {
    prefetchData,
    optimizeQuery
  };
}