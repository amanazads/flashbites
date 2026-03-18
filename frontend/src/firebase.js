// Firebase configuration for FlashBites
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// All values injected from .env via Vite (must start with VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ─── FCM Messaging ────────────────────────────────────────────────────────────
// FCM VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const FCM_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';

let messagingInstance = null;

const getMessagingInstance = async () => {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
};

/**
 * Request FCM permission and get the device token.
 * Token is used by the backend to send targeted push notifications.
 */
export const getFCMToken = async () => {
  try {
    // Guard: if Firebase config is incomplete, skip FCM entirely
    if (!firebaseConfig.projectId || firebaseConfig.projectId === 'undefined') {
      console.warn('FCM skipped — Firebase projectId not configured in env vars');
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    let swRegistration;
    // Register the service worker and pass registration handle to getToken
    if ('serviceWorker' in navigator) {
      const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&messagingSenderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}`;
      swRegistration = await navigator.serviceWorker.register(swUrl);
    }

    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
    });

    if (token) {
      console.log('✅ FCM token obtained:', token.slice(0, 20) + '...');
      return token;
    } else {
      console.warn('No FCM token available — notification permission may be blocked');
      return null;
    }
  } catch (error) {
    if (error?.name === 'AbortError' || /Registration failed - push service error/i.test(error?.message || '')) {
      console.warn('FCM token unavailable in this browser/session:', error?.message || error);
      return null;
    }
    console.warn('Failed to get FCM token:', error?.message || error);
    return null;
  }
};


/**
 * Listen for foreground FCM messages (when app is open/focused).
 */
export const onForegroundMessage = async (callback) => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    return onMessage(messaging, callback);
  } catch {
    return () => {};
  }
};

/**
 * Setup invisible reCAPTCHA verifier.
 * Call this before sending OTP. The #recaptcha-container element must exist in the DOM.
 */
export const setupRecaptcha = () => {
  // Clear existing verifier to avoid conflicts on re-renders
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (e) { /* ignore */ }
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved - will proceed with OTP send
      },
      "expired-callback": () => {
        // Response expired - ask user to retry
        window.recaptchaVerifier = null;
      }
    }
  );

  return window.recaptchaVerifier;
};

/**
 * Send OTP to a phone number using Firebase Phone Auth.
 * @param {string} phoneNumber - e.g. "+911234567890"
 */
export const sendPhoneOTP = async (phoneNumber) => {
  const appVerifier = window.recaptchaVerifier;
  if (!appVerifier) {
    throw new Error('reCAPTCHA not initialized. Call setupRecaptcha() first.');
  }

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (error) {
    // Reset reCAPTCHA on error so user can retry
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) { /* ignore */ }
      window.recaptchaVerifier = null;
    }
    throw error;
  }
};

/**
 * Verify the OTP code.
 * @param {string} code - The 6-digit OTP
 * @returns {Promise<string>} Firebase ID token
 */
export const verifyPhoneOTP = async (code) => {
  if (!window.confirmationResult) {
    throw new Error('No OTP was sent. Please request OTP first.');
  }
  const result = await window.confirmationResult.confirm(code);
  return await result.user.getIdToken();
};

export { app, auth };
export default app;
