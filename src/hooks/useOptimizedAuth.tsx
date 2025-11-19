import { useMemo } from 'react';
import { useAuthContext } from '@/components/AuthProvider';

// Optimized auth hook that prevents unnecessary re-renders
export const useOptimizedAuth = () => {
  const { user, signOut } = useAuthContext();
  
  // Memoize user data to prevent unnecessary re-renders
  const memoizedUser = useMemo(() => user, [user?.id, user?.email]);
  
  return {
    user: memoizedUser,
    signOut,
    isAuthenticated: !!memoizedUser,
    userId: memoizedUser?.id
  };
};