import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';

// Common paths that users often navigate to
const commonPaths = {
  client: [
    { path: '/dashboard', queryKeys: ['bookings', 'client-profile'] },
    { path: '/client/calendar', queryKeys: ['bookings', 'interviews'] },
    { path: '/client/payment-settings', queryKeys: ['payment-methods', 'invoices'] }
  ],
  nanny: [
    { path: '/nanny', queryKeys: ['nanny-bookings', 'nanny-profile'] },
    { path: '/nanny/calendar', queryKeys: ['nanny-schedule', 'interviews'] }
  ],
  admin: [
    { path: '/admin', queryKeys: ['admin-overview', 'pending-approvals'] },
    { path: '/admin/bookings', queryKeys: ['all-bookings', 'booking-stats'] }
  ]
};

export function useDataPrefetching() {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const userType = user?.user_metadata?.user_type;

  useEffect(() => {
    if (!userType) return;

    // Get common paths for the user type
    const paths = commonPaths[userType as keyof typeof commonPaths] || [];
    
    // Find current path in common paths
    const currentPathInfo = paths.find(p => pathname.startsWith(p.path));
    
    if (currentPathInfo) {
      // Prefetch queries for current path
      currentPathInfo.queryKeys.forEach(key => {
        queryClient.prefetchQuery({
          queryKey: [key, user?.id],
          staleTime: 2 * 60 * 1000 // Consider data fresh for 2 minutes
        });
      });

      // Find next likely path and prefetch its data
      const currentIndex = paths.indexOf(currentPathInfo);
      const nextPath = paths[currentIndex + 1];
      if (nextPath) {
        nextPath.queryKeys.forEach(key => {
          queryClient.prefetchQuery({
            queryKey: [key, user?.id],
            staleTime: 30 * 1000 // Consider prefetched data fresh for 30 seconds
          });
        });
      }
    }
  }, [pathname, queryClient, user?.id, userType]);

  // Function to manually trigger prefetch for a specific route
  const prefetchRoute = (route: string) => {
    if (!userType) return;
    
    const paths = commonPaths[userType as keyof typeof commonPaths] || [];
    const pathInfo = paths.find(p => p.path === route);
    
    if (pathInfo) {
      pathInfo.queryKeys.forEach(key => {
        queryClient.prefetchQuery({
          queryKey: [key, user?.id],
          staleTime: 30 * 1000
        });
      });
    }
  };

  return { prefetchRoute };
}