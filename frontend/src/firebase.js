import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

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

export const sendPhoneOTP = async (phoneNumber) => {
  if (otpRequestPromise) {
    return otpRequestPromise;
  }

  otpRequestPromise = (async () => {
  try {
    const appVerifier = setupRecaptcha();
    
    // Do NOT call await appVerifier.render() manually.
    // signInWithPhoneNumber will automatically render and verify the reCAPTCHA.
    // Manually rendering it and then letting Firebase interact with it is a common 
    // root cause of the "Network connection was lost / Enterprise config" timeout error.

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (error) {
    console.error("Sending OTP error:", error);
    // Let the user retry by fully resetting verifier/container state.
    resetRecaptchaState();
    throw error;
  } finally {
    otpRequestPromise = null;
  }
  })();

  return otpRequestPromise;
};

export const verifyPhoneOTP = async (otpCode) => {
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
  if (msg.includes('auth/invalid-phone-number')) return "Invalid phone number format. Please check the number.";
  if (msg.includes('auth/too-many-requests')) return "Too many attempts. Please try again later.";
  if (msg.includes('auth/invalid-verification-code')) return "Incorrect OTP code. Please enter the correct code.";
  if (msg.includes('auth/code-expired')) return "The OTP code has expired. Please request a new one.";
  if (msg.includes('auth/captcha-check-failed') || msg.includes('auth/invalid-app-credential')) return "Device verification failed. Please check your connection and try again.";
  if (msg.includes('auth/network-request-failed')) return "Network error. Please check your internet connection.";
  return `Error: ${msg.replace('auth/', '')}`;
};

// Removed Messaging logic to start purely from scratch for Auth as requested.
export const getFCMToken = async () => null;
export const onForegroundMessage = async () => () => {};

export { app, auth };
export default app;
