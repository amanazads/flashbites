import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();
let otpRequestPromise = null;
let nativeVerificationId = null;
let nativePhoneFlowStarted = false;
let currentOtpMode = 'web';

const isNativePlatform = () => Boolean(window?.Capacitor?.isNativePlatform?.());

const isNativeAuthConfigurationError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('not authorized to use firebase authentication') ||
    message.includes('play_integrity_token') ||
    message.includes('no matching sha-256') ||
    message.includes('package name/sha256')
  );
};

// We DO NOT set appVerificationDisabledForTesting = true here.
// Doing so would block REAL phone numbers from receiving OTPs on localhost.
// The ReCAPTCHA timeout / "Network connection was lost" issue is fixed by 
// the static #recaptcha-wrapper in index.html which prevents Vite HMR from 
// destroying the google iframes mid-flight.

const getOrCreateRecaptchaContainer = () => {
  let container = document.getElementById('recaptcha-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';

    // Append to static wrapper in index.html to avoid HMR/body mutations.
    const wrapper = document.getElementById('recaptcha-wrapper') || document.body;
    wrapper.appendChild(container);
    return container;
  }

  // If Firebase verifier reference was lost but widget markup remains, recreate node.
  if (!window.recaptchaVerifier && container.childElementCount > 0) {
    const fresh = document.createElement('div');
    fresh.id = 'recaptcha-container';
    container.replaceWith(fresh);
    return fresh;
  }

  return container;
};

const resetRecaptchaState = () => {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (e) {}
    window.recaptchaVerifier = null;
  }

  const container = document.getElementById('recaptcha-container');
  if (container && container.childElementCount > 0) {
    const fresh = document.createElement('div');
    fresh.id = 'recaptcha-container';
    container.replaceWith(fresh);
  }
};

export const setupRecaptcha = () => {
  getOrCreateRecaptchaContainer();

  // Only create the verifier if it doesn't already exist
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        console.log("reCAPTCHA solved");
      },
      'expired-callback': () => {
        console.log("reCAPTCHA expired");
        resetRecaptchaState();
      }
    });
  }
  return window.recaptchaVerifier;
};

const sendPhoneOtpWeb = async (phoneNumber) => {
  const appVerifier = setupRecaptcha();

  // Do NOT call await appVerifier.render() manually.
  // signInWithPhoneNumber will automatically render and verify the reCAPTCHA.
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
};

export const sendPhoneOTP = async (phoneNumber) => {
  if (otpRequestPromise) {
    return otpRequestPromise;
  }

  otpRequestPromise = (async () => {
    try {
      if (isNativePlatform()) {
        const listenerHandles = [];

        try {
          const payload = await new Promise(async (resolve, reject) => {
            let settled = false;
            const timeoutId = setTimeout(() => {
              if (settled) return;
              settled = true;
              reject(new Error('Phone verification timed out. Please try again.'));
            }, 90000);

            const settleResolve = (value) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              resolve(value);
            };

            const settleReject = (error) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              reject(error instanceof Error ? error : new Error(String(error || 'Phone verification failed')));
            };

            try {
              listenerHandles.push(await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
                nativeVerificationId = event?.verificationId || null;
                nativePhoneFlowStarted = true;
                settleResolve({ verificationId: nativeVerificationId });
              }));

              listenerHandles.push(await FirebaseAuthentication.addListener('phoneVerificationCompleted', () => {
                nativePhoneFlowStarted = true;
                settleResolve({ autoVerified: true });
              }));

              listenerHandles.push(await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
                settleReject(new Error(event?.message || 'Phone verification failed'));
              }));

              await FirebaseAuthentication.signInWithPhoneNumber({
                phoneNumber,
                resendCode: nativePhoneFlowStarted,
                timeout: 60
              });
            } catch (error) {
              settleReject(error);
            }
          });

          currentOtpMode = 'native';
          return payload;
        } catch (error) {
          if (!isNativeAuthConfigurationError(error)) {
            throw error;
          }

          // Fallback to web flow for emergency continuity while Firebase SHA config is fixed.
          currentOtpMode = 'web';
          nativeVerificationId = null;
        } finally {
          await Promise.allSettled(listenerHandles.map((h) => h.remove()));
        }
      }

      currentOtpMode = 'web';
      return await sendPhoneOtpWeb(phoneNumber);
    } catch (error) {
      console.error("Sending OTP error:", error);
      resetRecaptchaState();
      throw error;
    } finally {
      otpRequestPromise = null;
    }
  })();

  return otpRequestPromise;
};

export const verifyPhoneOTP = async (otpCode) => {
  if (isNativePlatform() && currentOtpMode === 'native') {
    try {
      if (nativeVerificationId && otpCode) {
        await FirebaseAuthentication.confirmVerificationCode({
          verificationId: nativeVerificationId,
          verificationCode: otpCode
        });
      } else {
        const current = await FirebaseAuthentication.getCurrentUser();
        if (!current?.user) {
          throw new Error('No OTP request found. Please request OTP again.');
        }
      }

      const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
      if (!token) {
        throw new Error('Phone verification token not available. Please try again.');
      }

      nativeVerificationId = null;
      nativePhoneFlowStarted = false;
      return token;
    } catch (error) {
      console.error("Verifying OTP error (native):", error);
      throw error;
    }
  }

  if (!window.confirmationResult) {
    throw new Error('No OTP request found. Please request OTP again.');
  }
  
  try {
    const result = await window.confirmationResult.confirm(otpCode);
    const token = await result.user.getIdToken();
    return token;
  } catch (error) {
    console.error("Verifying OTP error:", error);
    throw error;
  }
};

export const getReadableFirebaseAuthError = (error) => {
  if (!error) return "An unknown error occurred. Please try again.";
  const msg = error.code || error.message || String(error);
  const normalized = String(msg).toLowerCase();
  if (msg.includes('auth/invalid-phone-number')) return "Invalid phone number format. Please check the number.";
  if (msg.includes('auth/too-many-requests')) return "Too many attempts. Please try again later.";
  if (msg.includes('auth/invalid-verification-code')) return "Incorrect OTP code. Please enter the correct code.";
  if (msg.includes('auth/code-expired')) return "The OTP code has expired. Please request a new one.";
  if (
    normalized.includes('not authorized to use firebase authentication') ||
    normalized.includes('play_integrity_token') ||
    normalized.includes('no matching sha-256') ||
    normalized.includes('package name/sha256')
  ) {
    return "Android app verification is not configured in Firebase yet (package/SHA mismatch). Please add the correct SHA-256 and SHA-1 for this app in Firebase Console and try again.";
  }
  if (msg.includes('auth/captcha-check-failed') || msg.includes('auth/invalid-app-credential')) return "Device verification failed. Please check your connection and try again.";
  if (msg.includes('auth/network-request-failed')) return "Network error. Please check your internet connection.";
  return `Error: ${msg.replace('auth/', '')}`;
};

// Removed Messaging logic to start purely from scratch for Auth as requested.
export const getFCMToken = async () => null;
export const onForegroundMessage = async () => () => {};

export { app, auth };
export default app;
