import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080';
  const locationProxyTarget = env.VITE_DEV_LOCATION_PROXY_TARGET || 'http://localhost:8080';
  const contactProxyTarget = env.VITE_DEV_CONTACT_PROXY_TARGET || 'http://localhost:8080';

  return {
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
        '/api/contact': {
          target: contactProxyTarget,
          changeOrigin: true,
        },
        '/api/location': {
          target: locationProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: proxyTarget,
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
  };
});
