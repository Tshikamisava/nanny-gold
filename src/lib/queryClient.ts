import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});
