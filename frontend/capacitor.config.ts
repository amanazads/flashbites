import { CapacitorConfig } from '@capacitor/cli';

const useRemote = process.env.CAP_USE_REMOTE === 'true';
const remoteUrl = process.env.CAP_REMOTE_URL || 'https://flashbites.in';

const config: CapacitorConfig = {
  appId: 'com.flashbites.app',
  appName: 'FlashBites',
  webDir: 'dist',
  server: {
    // Keep a stable https://localhost origin in native WebView for Firebase auth.
    hostname: 'localhost',
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      'flashbites-backend.onrender.com',
      'flashbites.in',
      'www.flashbites.in',
      'checkout.razorpay.com',
      'checkout-static-next.razorpay.com',
      'api.razorpay.com',
      'lumberjack.razorpay.com',
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.google.com',
      '*.gstatic.com'
    ],
    ...(useRemote
      ? {
          // Optional: load the hosted site in native WebView when explicitly enabled.
          url: remoteUrl,
        }
      : {}),
  },
};

export default config;