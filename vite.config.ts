import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    sourcemap: false, // Disable source maps for smaller mobile bundles
    target: 'es2020', // Modern target for native WebViews (Android 7+, iOS 14+)
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Optimal chunk splitting for mobile loading
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Compress for faster mobile loads
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  // Optimize dev server performance
  server: {
    hmr: {
      overlay: false // Disable HMR overlay for better performance
    }
  }
})
