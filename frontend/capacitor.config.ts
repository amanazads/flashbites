import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flashbites.app',
  appName: 'FlashBites',
  webDir: 'dist',
  server: {
    // IMPORTANT: Using the firebaseapp domain bypasses both the API Key referrer restrictions 
    // AND satisfies reCAPTCHA Enterprise domain requirements simultaneously on native devices.
    hostname: 'flashbites-shop.firebaseapp.com',
    androidScheme: 'https',
    iosScheme: 'https',
  }
};

export default config;