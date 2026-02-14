
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { initializeNativePlatform } from './utils/nativePlatform';

// Create a client with optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

const root = createRoot(document.getElementById('root')!);

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// Initialize native platform features (no-op on web)
initializeNativePlatform();
