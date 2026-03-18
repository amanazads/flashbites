import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Detect if running in Capacitor
const isCapacitor = window.Capacitor !== undefined;

// Log the API URL and environment
console.log('🔗 API Base URL:', apiUrl);
console.log('📱 Running in Capacitor:', isCapacitor);
console.log('🌍 Environment:', import.meta.env.MODE);

const instance = axios.create({
  baseURL: apiUrl,
  timeout: isCapacitor ? 60000 : 30000, // 60s on mobile (Render cold start), 30s on web
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: !isCapacitor, // Disable withCredentials for Capacitor apps
});

// Request interceptor for adding auth token
instance.interceptors.request.use(
  async (config) => {
    let token;
    
    if (isCapacitor) {
      // On Capacitor, try Preferences first (the correct native store)
      const { value: prefToken } = await Preferences.get({ key: 'token' });
      token = prefToken;
      if (!token) {
        const { value: prefAccess } = await Preferences.get({ key: 'accessToken' });
        token = prefAccess;
      }

      // Fallback: token may have been saved to localStorage (web session, or Register flow)
      // Migrate it to Preferences so all future requests work correctly
      if (!token) {
        const lsToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (lsToken) {
          token = lsToken;
          // Migrate to Preferences so next request finds it there
          await Preferences.set({ key: 'token', value: lsToken });
          console.log('🔄 Token migrated from localStorage → Preferences');
        }
      }
    } else {
      // Use localStorage for web
      token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If sending FormData in browser, remove default Content-Type so browser sets boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      if (config.headers.post) delete config.headers.post['Content-Type'];
      if (config.headers.put) delete config.headers.put['Content-Type'];
      if (config.headers.patch) delete config.headers.patch['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);


// Response interceptor for handling errors
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Skip noisy logs for expected auth-check failures and simple coupon validation
    const isExpectedAuthCheckFailure = status === 401 && url.includes('/auth/me');
    const isExpectedCouponFailure = (status === 404 || status === 400) && url.includes('/coupons/validate');
    const isExpectedNotificationAuthFailure = (status === 401 || status === 403) && url.includes('/notifications');
    const isExpectedAccountDeletionNotReady = status === 404 && url.includes('/users/account-deletion-requests');

    // Log the full error for debugging
    if (!isExpectedAuthCheckFailure && !isExpectedCouponFailure && !isExpectedNotificationAuthFailure && !isExpectedAccountDeletionNotReady) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status,
        message: error.response?.data?.message || error.message,
        baseURL: error.config?.baseURL,
      });
    }

    if (status === 401) {
      // Only treat as a real session expiry if the user is explicitly on/navigating to a protected page.
      // Background calls (FCM token, /auth/me, socket setup, etc.) should NOT wipe the session.
      const protectedRoutes = ['/checkout', '/orders', '/profile', '/auth/logout', '/users/addresses'];
      const isProtectedRequest = protectedRoutes.some(route => url.includes(route));
      const protectedPagePrefixes = ['/checkout', '/orders', '/profile', '/notifications', '/dashboard', '/delivery-dashboard', '/admin'];
      const isOnProtectedPage = protectedPagePrefixes.some((prefix) => window.location.pathname.startsWith(prefix));

      // Only clear tokens + redirect when this is a user-facing protected action, not a background call.
      // This prevents register/login flows from being disrupted by background 401s (e.g. FCM token, /auth/me)
      if (isProtectedRequest && isOnProtectedPage) {
        if (isCapacitor) {
          await Preferences.remove({ key: 'token' });
          await Preferences.remove({ key: 'accessToken' });
          await Preferences.remove({ key: 'refreshToken' });
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);


export default instance;
