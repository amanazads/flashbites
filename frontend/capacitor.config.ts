import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flashbites.app',
  appName: 'FlashBites',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  }
};

export default config;