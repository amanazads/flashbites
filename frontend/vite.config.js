import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — virtually never changes, cached aggressively
          'vendor-react': ['react', 'react-dom'],
          // Routing
          'vendor-router': ['react-router-dom'],
          // Redux state management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          // Firebase — large, keep isolated so browser caches it separately
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/messaging'],
          // UI utilities
          'vendor-ui': ['react-hot-toast', 'react-helmet-async', 'sweetalert2'],
          // Icon packs and date utilities are heavily reused
          'vendor-icons': ['@heroicons/react/24/outline', '@heroicons/react/24/solid'],
          'vendor-date': ['date-fns'],
          // HTTP + Socket
          'vendor-network': ['axios', 'socket.io-client'],
          // Capacitor native plugins
          'vendor-capacitor': [
            '@capacitor/core',
            '@capacitor/preferences',
            '@capacitor/local-notifications',
          ],
        },
      },
    },
  },
});
