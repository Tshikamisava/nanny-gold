
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst', // Use cache when network is unstable
      gcTime: 10 * 60 * 1000, // Keep unused data for 10 minutes
    },
    mutations: {
      retry: 1,
      networkMode: 'online', // Only attempt mutations when online
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
