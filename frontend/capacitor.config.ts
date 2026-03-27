import { CapacitorConfig } from '@capacitor/cli';

const useRemote = process.env.CAP_USE_REMOTE === 'true';

const config: CapacitorConfig = {
  appId: 'com.flashbites.app',
  appName: 'FlashBites',
  webDir: 'dist',
  server: {
    // Keep a stable https://localhost origin in native WebView for Firebase auth.
    androidScheme: 'https',
    iosScheme: 'https',
    ...(useRemote
      ? {
          // Optional: load the hosted site in native WebView when explicitly enabled.
          hostname: 'flashbites.in',
        }
      : {}),
  },
};

export default config;