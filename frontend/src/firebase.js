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
const RECAPTCHA_ROOT_ID = 'recaptcha-root';
const OTP_SEND_COOLDOWN_MS = 60 * 1000;
const OTP_SEND_ATTEMPT_KEY_PREFIX = 'fb_otp_send_last_attempt:';
const OTP_PROVIDER_BLOCK_MS = 10 * 60 * 1000;
const OTP_PROVIDER_BLOCK_KEY_PREFIX = 'fb_otp_provider_block_until:';
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isOtpTestMode = import.meta.env.VITE_FIREBASE_OTP_TEST_MODE === 'true';
const isNativeOtpTestMode = import.meta.env.VITE_FIREBASE_NATIVE_OTP_TEST_MODE === 'true';
const allowLocalhostRealOtp = import.meta.env.VITE_FIREBASE_ALLOW_LOCALHOST_REAL_OTP === 'true';
const isCapacitorNative = !!(window.Capacitor?.isNativePlatform?.() ?? window.Capacitor);
let otpSendInFlight = false;
let otpLastAttemptAt = 0;

// Disable app verification only for explicit test modes.
if ((isLocalhost && isOtpTestMode) || (isCapacitorNative && isNativeOtpTestMode)) {
  auth.settings.appVerificationDisabledForTesting = true;
}

const requiredFirebaseKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
];

const isFirebaseAuthConfigured = () => requiredFirebaseKeys.every((k) => {
  const value = firebaseConfig[k];
  return !!value && value !== 'undefined' && value !== 'null';
});

const storageSet = async (key, value) => {
  if (window.Capacitor) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: String(value) });
      return;
    } catch {
      // Fall back to localStorage.
    }
  }
  localStorage.setItem(key, String(value));
};

const storageGet = async (key) => {
  if (window.Capacitor) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      // Fall back to localStorage.
    }
  }
  return localStorage.getItem(key);
};

const getOtpAttemptKey = (phoneNumber) => {
  const normalized = String(phoneNumber || '').replace(/\D/g, '');
  return `${OTP_SEND_ATTEMPT_KEY_PREFIX}${normalized || 'unknown'}`;
};

const getOtpProviderBlockKey = (phoneNumber) => {
  const normalized = String(phoneNumber || '').replace(/\D/g, '');
  return `${OTP_PROVIDER_BLOCK_KEY_PREFIX}${normalized || 'unknown'}`;
};

const normalizeFirebaseErrorCode = (rawCode) => {
  const value = String(rawCode || '').trim();
  if (!value) return '';

  if (value.startsWith('auth/')) {
    return value.toLowerCase();
  }

  const normalized = value.toUpperCase();
  const map = {
    TOO_MANY_ATTEMPTS_TRY_LATER: 'auth/too-many-requests',
    QUOTA_EXCEEDED: 'auth/too-many-requests',
    BILLING_NOT_ENABLED: 'auth/billing-not-enabled',
    CAPTCHA_CHECK_FAILED: 'auth/captcha-check-failed',
    INVALID_RECAPTCHA_TOKEN: 'auth/invalid-recaptcha-token',
    INVALID_APP_CREDENTIAL: 'auth/invalid-app-credential',
    INVALID_PHONE_NUMBER: 'auth/invalid-phone-number',
    MISSING_CLIENT_IDENTIFIER: 'auth/invalid-app-credential',
    OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
    APP_NOT_AUTHORIZED: 'auth/app-not-authorized',
  };

  return map[normalized] || '';
};

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
 * Uses an ephemeral hidden DOM node to avoid duplicate render conflicts.
 */
const ensureRecaptchaRoot = () => {
  let root = document.getElementById(RECAPTCHA_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = RECAPTCHA_ROOT_ID;
    root.style.position = 'fixed';
    root.style.left = '-9999px';
    root.style.top = '0';
    root.style.width = '1px';
    root.style.height = '1px';
    root.style.overflow = 'hidden';
    root.style.pointerEvents = 'none';
    document.body.appendChild(root);
  }
  return root;
};

const createRecaptchaContainer = () => {
  const root = ensureRecaptchaRoot();
  const container = document.createElement('div');
  const uniqueId = `recaptcha-container-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  container.id = uniqueId;
  root.appendChild(container);
  window.recaptchaContainerId = uniqueId;
  return uniqueId;
};

const resetRecaptcha = () => {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (e) { /* ignore */ }
  }

  window.recaptchaVerifier = null;
  window.recaptchaWidgetPromise = null;

  const oldContainerId = window.recaptchaContainerId;
  if (oldContainerId) {
    const container = document.getElementById(oldContainerId);
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    window.recaptchaContainerId = null;
  }
};

export const setupRecaptcha = ({ force = false } = {}) => {
  if (!isFirebaseAuthConfigured()) {
    throw new Error('Firebase config missing. Please set VITE_FIREBASE_* env values.');
  }

  ensureRecaptchaRoot();

  if (force) {
    resetRecaptcha();
  } else if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  const containerId = createRecaptchaContainer();

  const verifier = new RecaptchaVerifier(
    auth,
    containerId,
    {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved - will proceed with OTP send
      },
      "expired-callback": () => {
        // Response expired - ask user to retry
        resetRecaptcha();
      }
    }
  );

  window.recaptchaVerifier = verifier;
  // Render immediately so OTP send doesn't fail on first interaction.
  window.recaptchaWidgetPromise = verifier.render().catch((error) => {
    resetRecaptcha();
    throw error;
  });

  return verifier;
};

/**
 * Send OTP to a phone number using Firebase Phone Auth.
 * @param {string} phoneNumber - e.g. "+911234567890"
 */
export const sendPhoneOTP = async (phoneNumber) => {
  if (!isFirebaseAuthConfigured()) {
    throw new Error('Firebase Phone Auth is not configured. Please contact support.');
  }

  if (isLocalhost && !isCapacitorNative && !isOtpTestMode && !allowLocalhostRealOtp) {
    const localModeError = new Error('Localhost OTP is blocked to prevent invalid reCAPTCHA token failures. Enable VITE_FIREBASE_OTP_TEST_MODE=true and use Firebase fictional test numbers, or set VITE_FIREBASE_ALLOW_LOCALHOST_REAL_OTP=true if your localhost reCAPTCHA setup is fully configured.');
    localModeError.code = 'auth/localhost-otp-requires-test-mode';
    throw localModeError;
  }

  const providerBlockKey = getOtpProviderBlockKey(phoneNumber);
  const providerBlockUntil = Number((await storageGet(providerBlockKey)) || 0);
  const now = Date.now();
  if (providerBlockUntil > now) {
    const remaining = Math.ceil((providerBlockUntil - now) / 1000);
    const providerBlockedError = new Error(`Too many OTP attempts. Please wait ${remaining}s before trying again.`);
    providerBlockedError.code = 'auth/provider-throttled-local';
    throw providerBlockedError;
  }

  const attemptKey = getOtpAttemptKey(phoneNumber);
  const storedLastAttemptAt = Number((await storageGet(attemptKey)) || 0);
  const lastAttemptAt = Math.max(otpLastAttemptAt, storedLastAttemptAt);
  const elapsedSinceLastAttempt = now - lastAttemptAt;
  if (elapsedSinceLastAttempt >= 0 && elapsedSinceLastAttempt < OTP_SEND_COOLDOWN_MS) {
    const remaining = Math.ceil((OTP_SEND_COOLDOWN_MS - elapsedSinceLastAttempt) / 1000);
    const throttleError = new Error(`Please wait ${remaining}s before requesting another OTP.`);
    throttleError.code = 'auth/client-throttled';
    throw throttleError;
  }

  if (otpSendInFlight) {
    const inFlightError = new Error('OTP request is already in progress. Please wait a moment.');
    inFlightError.code = 'auth/request-in-progress';
    throw inFlightError;
  }

  otpSendInFlight = true;
  otpLastAttemptAt = now;
  await storageSet(attemptKey, String(now));

  // Reuse verifier by default to avoid unnecessary Firebase interactions.
  let appVerifier = null;

  try {
    // Native WebView flows are more sensitive to stale verifier state.
    const forceFreshVerifier = isCapacitorNative;
    appVerifier = setupRecaptcha({ force: forceFreshVerifier });

    if (window.recaptchaWidgetPromise) {
      try {
        await window.recaptchaWidgetPromise;
      } catch {
        appVerifier = setupRecaptcha({ force: true });
        if (window.recaptchaWidgetPromise) {
          await window.recaptchaWidgetPromise;
        }
      }
    }

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    // Clear verifier after a successful send so the next attempt starts clean.
    resetRecaptcha();
    return confirmationResult;
  } catch (error) {
    const code = extractFirebaseAuthCode(error);
    console.error('OTP_DIAGNOSTIC', buildOtpDiagnostic(code));

    if (code === 'auth/too-many-requests') {
      await storageSet(providerBlockKey, String(Date.now() + OTP_PROVIDER_BLOCK_MS));
    }

    // Do not auto-retry sendVerificationCode. Firebase SDK may already perform
    // internal fallback flows, and a second app-level retry can trigger provider throttling.
    resetRecaptcha();
    throw error;
  } finally {
    otpSendInFlight = false;
  }
};

const extractFirebaseAuthCode = (error) => {
  const normalizedFromCode = normalizeFirebaseErrorCode(error?.code);
  if (normalizedFromCode) {
    return normalizedFromCode;
  }

  const tokenMessageCode = normalizeFirebaseErrorCode(error?.customData?._tokenResponse?.error?.message);
  if (tokenMessageCode) {
    return tokenMessageCode;
  }

  const serverResponseRaw = String(error?.customData?._serverResponse || '');
  if (serverResponseRaw) {
    try {
      const parsed = JSON.parse(serverResponseRaw);
      const fromParsed = normalizeFirebaseErrorCode(parsed?.error?.message);
      if (fromParsed) {
        return fromParsed;
      }
    } catch {
      const upperSnakeMatch = serverResponseRaw.match(/\b[A-Z_]{6,}\b/);
      if (upperSnakeMatch) {
        const fromServerText = normalizeFirebaseErrorCode(upperSnakeMatch[0]);
        if (fromServerText) {
          return fromServerText;
        }
      }
    }
  }

  const message = String(error?.message || '');
  const match = message.match(/auth\/[a-z-]+/i);
  if (match) {
    return match[0].toLowerCase();
  }

  const upperSnakeMatch = message.match(/\b[A-Z_]{6,}\b/);
  if (upperSnakeMatch) {
    return normalizeFirebaseErrorCode(upperSnakeMatch[0]);
  }

  return '';
};

const buildOtpDiagnostic = (errorCode) => ({
  hostname: window.location.hostname,
  authDomain: firebaseConfig.authDomain || '',
  online: navigator.onLine,
  isCapacitorNative,
  otpTestMode: isOtpTestMode,
  firebaseCode: errorCode || 'unknown',
});

export const getReadableFirebaseAuthError = (error) => {
  const code = extractFirebaseAuthCode(error);

  if (code === 'auth/too-many-requests') {
    if (isLocalhost && !isOtpTestMode) {
      return 'Too many OTP attempts from this environment. For localhost testing, enable VITE_FIREBASE_OTP_TEST_MODE=true and use Firebase test phone numbers.';
    }
    return 'Too many OTP attempts. Please wait 5-10 minutes before trying again.';
  }
  if (code === 'auth/provider-throttled-local') {
    return error?.message || 'Too many OTP attempts. Please wait before trying again.';
  }
  if (code === 'auth/client-throttled') {
    return error?.message || 'Please wait a few seconds before requesting another OTP.';
  }
  if (code === 'auth/request-in-progress') {
    return 'OTP request is already in progress. Please wait a moment.';
  }
  if (code === 'auth/localhost-otp-requires-test-mode') {
    return error?.message || 'Localhost OTP requires Firebase test mode or explicit localhost real-OTP override.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Invalid phone number format. Please check and retry.';
  }
  if (code === 'auth/configuration-not-found') {
    return 'Firebase Phone Auth is not enabled for this project.';
  }
  if (code === 'auth/app-not-authorized') {
    return 'This app is not authorized for Firebase Phone Auth. Check Firebase Console -> Authentication -> Settings -> Authorized domains.';
  }
  if (code === 'auth/invalid-recaptcha-token') {
    if (isLocalhost && !isOtpTestMode) {
      return 'Invalid reCAPTCHA token on localhost. For local testing, set VITE_FIREBASE_OTP_TEST_MODE=true and use Firebase fictional test numbers, or test on your production domain.';
    }
    return 'Invalid reCAPTCHA token. Verify Firebase Authorized domains and Identity Platform reCAPTCHA key/domain configuration, then try again.';
  }
  if (code === 'auth/captcha-check-failed' || code === 'auth/invalid-app-credential') {
    return 'Could not verify this device request. Check Firebase Phone Auth authorized domains and try again after a short wait.';
  }
  if (code === 'auth/argument-error') {
    return 'OTP verification setup failed on this app session. Please close and reopen the app, then request OTP again.';
  }
  if (code === 'auth/invalid-verification-code') {
    return 'The OTP is incorrect. Please enter the 6-digit code again.';
  }
  if (code === 'auth/invalid-verification-id' || code === 'auth/missing-verification-id') {
    return 'Your OTP session is invalid or expired. Please request a fresh OTP and try again.';
  }
  if (code === 'auth/session-expired') {
    return 'Your OTP session has expired. Please request a new OTP.';
  }
  if (code === 'auth/code-expired') {
    return 'This OTP has expired. Please request a new OTP.';
  }
  if (code === 'auth/missing-verification-code') {
    return 'Please enter the OTP sent to your phone.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while sending OTP. Check internet/VPN/ad-blocker. For localhost testing, use Firebase test numbers with VITE_FIREBASE_OTP_TEST_MODE=true.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Phone authentication is disabled in Firebase Console. Enable it under Authentication -> Sign-in method.';
  }
  if (code === 'auth/billing-not-enabled') {
    return 'Firebase Phone Auth billing/quota is not enabled for this project. Check Firebase Console -> Usage and billing.';
  }

  // Prefer a specific backend/Firebase message when code parsing fails.
  const responseMessage =
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || (typeof error?.response?.data?.errors === 'string' ? error.response.data.errors : '');
  const rawMessage = String(responseMessage || error?.message || '').trim();

  if (rawMessage) {
    const cleaned = rawMessage.replace(/^firebase:\s*/i, '').replace(/^error:\s*/i, '').trim();
    if (cleaned.length > 4) {
      return cleaned;
    }
  }

  return 'Could not verify OTP right now. Please request a new OTP and try again.';
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
