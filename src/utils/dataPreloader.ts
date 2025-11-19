import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Safely check if user is authenticated
async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

// Preload critical data for better performance (only when authenticated)
export async function preloadCriticalData(queryClient: QueryClient) {
  try {
    const isAuthenticated = await isUserAuthenticated();
    
    if (!isAuthenticated) {
      console.log('Skipping data preload - user not authenticated');
      return;
    }

    const preloadPromises = [
      // Preload current user profile data
      queryClient.prefetchQuery({
        queryKey: ['current-user-profile'],
        queryFn: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            return profile;
          } catch (error) {
            console.warn('Failed to preload user profile:', error);
            return null;
          }
        },
        staleTime: 15 * 60 * 1000,
      }),

      // Preload user roles for permissions
      queryClient.prefetchQuery({
        queryKey: ['user-roles'],
        queryFn: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);
            
            return roles || [];
          } catch (error) {
            console.warn('Failed to preload user roles:', error);
            return [];
          }
        },
        staleTime: 30 * 60 * 1000, // Roles don't change often
      })
    ];

    // Execute all preloads in parallel without blocking
    await Promise.allSettled(preloadPromises);
  } catch (error) {
    console.warn('Data preloading failed:', error);
  }
}

// Preload admin-specific data (only for admin users)
export async function preloadAdminData(queryClient: QueryClient) {
  try {
    await queryClient.prefetchQuery({
      queryKey: ['admin-dashboard-stats'],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_dashboard_stats');
        if (error) throw error;
        const stats = data?.[0] || {
          active_nannies: 0,
          total_clients: 0,
          today_bookings: 0,
          total_revenue: 0,
          support_tickets: 0
        };
        return {
          activeNannies: Number(stats.active_nannies) || 0,
          totalClients: Number(stats.total_clients) || 0,
          todayBookings: Number(stats.today_bookings) || 0,
          totalRevenue: Math.round(Number(stats.total_revenue)) || 0,
          supportTickets: Number(stats.support_tickets) || 0
        };
      },
      staleTime: 10 * 60 * 1000,
    });
  } catch (error) {
    console.warn('Admin data preloading failed:', error);
  }
}

// Initialize critical data preloading (safe initialization)
export function initializeDataPreloading(queryClient: QueryClient) {
  // Only preload after authentication is confirmed and app is stable
  setTimeout(() => {
    // Check if user is on landing page or auth pages before preloading
    const currentPath = window.location.pathname;
    const isPublicRoute = ['/', '/auth', '/login', '/admin-login', '/nanny/auth'].includes(currentPath);
    
    if (!isPublicRoute) {
      preloadCriticalData(queryClient);
    }
  }, 3000); // Increased delay to ensure app stability
}