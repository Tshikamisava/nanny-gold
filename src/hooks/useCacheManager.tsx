import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';

interface PrefetchConfig {
  staleTime?: number;
  cacheTime?: number;
}

export function useCacheManager() {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const { user } = useAuthContext();

  // Define common queries that should be prefetched
  const commonQueries = {
    client: {
      '/dashboard': ['bookings', 'client-profile'],
      '/client/calendar': ['bookings', 'interviews'],
      '/client/payment-settings': ['payment-methods', 'invoices']
    },
    nanny: {
      '/nanny': ['nanny-bookings', 'nanny-profile'],
      '/nanny/calendar': ['nanny-schedule', 'interviews']
    },
    admin: {
      '/admin': ['admin-overview', 'pending-approvals'],
      '/admin/bookings': ['all-bookings', 'booking-stats']
    }
  };

  // Prefetch data for a specific route
  const prefetchRoute = useCallback(async (
    route: string,
    config: PrefetchConfig = {}
  ) => {
    if (!user?.id) return;

    const userType = user.user_metadata?.user_type as keyof typeof commonQueries;
    const queries = commonQueries[userType]?.[route];

    if (queries) {
      const promises = queries.map(queryKey =>
        queryClient.prefetchQuery({
          queryKey: [queryKey, user.id],
          staleTime: config.staleTime ?? 30_000,
          cacheTime: config.cacheTime ?? 5 * 60_000
        })
      );
      await Promise.all(promises);
    }
  }, [queryClient, user]);

  // Watch route changes for prefetching
  useEffect(() => {
    const userType = user?.user_metadata?.user_type as keyof typeof commonQueries;
    if (!userType) return;

    const routes = Object.keys(commonQueries[userType] || {});
    const currentRouteIndex = routes.findIndex(route => pathname.startsWith(route));

    if (currentRouteIndex !== -1) {
      // Prefetch next route's data
      const nextRoute = routes[currentRouteIndex + 1];
      if (nextRoute) {
        prefetchRoute(nextRoute);
      }
    }
  }, [pathname, prefetchRoute, user]);

  // Manually invalidate queries
  const invalidateQueries = useCallback(async (
    queryKeys: string[],
    exact: boolean = false
  ) => {
    const promises = queryKeys.map(key =>
      queryClient.invalidateQueries({
        queryKey: exact ? [key] : [key, user?.id],
        exact
      })
    );
    await Promise.all(promises);
  }, [queryClient, user?.id]);

  // Clear specific queries from cache
  const clearQueries = useCallback(async (
    queryKeys: string[],
    exact: boolean = false
  ) => {
    const promises = queryKeys.map(key =>
      queryClient.removeQueries({
        queryKey: exact ? [key] : [key, user?.id],
        exact
      })
    );
    await Promise.all(promises);
  }, [queryClient, user?.id]);

  return {
    prefetchRoute,
    invalidateQueries,
    clearQueries
  };
}