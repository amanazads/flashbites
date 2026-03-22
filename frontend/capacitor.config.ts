import { CapacitorConfig } from '@capacitor/cli';

const useRemote = process.env.CAP_USE_REMOTE === 'true';

const config: CapacitorConfig = {
  appId: 'com.flashbites.app',
  appName: 'FlashBites',
  webDir: 'dist',
  ...(useRemote
    ? {
        server: {
          // Optional: load the hosted site in native WebView when explicitly enabled
          hostname: 'flashbites.in',
          androidScheme: 'https',
          iosScheme: 'https',
        },
      }
    : {}),
};

export default config;