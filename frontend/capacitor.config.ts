import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flashbites.app',
  appName: 'FlashBites',
  webDir: 'dist',
  server: {
    // Setting this to your main authorized domain fixes Firebase CORS and reCAPTCHA limits natively
    hostname: 'flashbites.in',
    androidScheme: 'https',
    iosScheme: 'https',
  }
};

export default config;