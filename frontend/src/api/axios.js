import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { getApiBaseUrl } from '../utils/apiBase';

const apiUrl = getApiBaseUrl();
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;

  const cap = window.Capacitor;
  if (!cap) return false;

  if (typeof cap.isNativePlatform === 'function') {
    return cap.isNativePlatform();
  }

  if (typeof cap.getPlatform === 'function') {
    return cap.getPlatform() !== 'web';
  }

  return window.location.protocol === 'https:' && window.location.hostname === 'localhost';
};

// Detect true native Capacitor runtime only (not plain web with capacitor scripts present)
const isCapacitor = isNativePlatform();

const clearAuthStorage = async () => {
  if (isCapacitor) {
    await Preferences.remove({ key: 'token' });
    await Preferences.remove({ key: 'accessToken' });
    await Preferences.remove({ key: 'refreshToken' });
    await Preferences.remove({ key: 'sessionStartedAt' });
  }
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('sessionStartedAt');
};

const getSessionStartedAt = async () => {
  if (isCapacitor) {
    const { value } = await Preferences.get({ key: 'sessionStartedAt' });
    if (value) return Number(value);
  }
  const value = localStorage.getItem('sessionStartedAt');
  return value ? Number(value) : null;
};

const setSessionStartedAtIfMissing = async () => {
  const now = Date.now();
  const existing = await getSessionStartedAt();
  if (!existing) {
    if (isCapacitor) {
      await Preferences.set({ key: 'sessionStartedAt', value: String(now) });
    }
    localStorage.setItem('sessionStartedAt', String(now));
  }
};

const getRefreshToken = async () => {
  if (isCapacitor) {
    const { value } = await Preferences.get({ key: 'refreshToken' });
    if (value) return value;
  }
  return localStorage.getItem('refreshToken');
};

let refreshPromise = null;

const protectedPagePrefixes = ['/checkout', '/orders', '/payment', '/profile', '/notifications', '/dashboard', '/delivery-dashboard', '/admin'];

const isOnProtectedPage = () => protectedPagePrefixes.some((prefix) => window.location.pathname.startsWith(prefix));

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
        }
      }
    } else {
      // Use localStorage for web
      token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    }
    
    if (token) {
      const startedAt = await getSessionStartedAt();
      if (startedAt && Date.now() - startedAt > SESSION_MAX_AGE_MS) {
        await clearAuthStorage();
        if (isOnProtectedPage() && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('Session expired after 30 days. Please login again.'));
      }

      await setSessionStartedAtIfMissing();
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
    return Promise.reject(error);
  }
);


// Response interceptor for handling errors
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const originalRequest = error.config || {};

    const isRefreshCall = url.includes('/auth/refresh');

    if (status === 401 && !isRefreshCall && !originalRequest._retry) {
      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        originalRequest._retry = true;

        try {
          if (!refreshPromise) {
            refreshPromise = axios.post(
              `${apiUrl}/auth/refresh`,
              { refreshToken },
              {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: !isCapacitor,
                timeout: isCapacitor ? 60000 : 30000,
              }
            );
          }

          const refreshRes = await refreshPromise;
          refreshPromise = null;

          const newAccessToken = refreshRes?.data?.data?.accessToken;
          if (!newAccessToken) {
            throw new Error('No access token returned by refresh endpoint');
          }

          if (isCapacitor) {
            await Preferences.set({ key: 'token', value: newAccessToken });
            await Preferences.set({ key: 'accessToken', value: newAccessToken });
          }
          localStorage.setItem('token', newAccessToken);
          localStorage.setItem('accessToken', newAccessToken);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          return instance(originalRequest);
        } catch (refreshError) {
          refreshPromise = null;
          await clearAuthStorage();
          if (isOnProtectedPage() && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }

    // Skip noisy logs for expected auth-check failures and simple coupon validation
    const isExpectedAuthCheckFailure = status === 401 && url.includes('/auth/me');
    const isExpectedCouponFailure = (status === 404 || status === 400) && url.includes('/coupons/validate');
    const isExpectedNotificationAuthFailure = (status === 401 || status === 403) && url.includes('/notifications');
    const isExpectedAccountDeletionNotReady = status === 404 && url.includes('/users/account-deletion-requests');
    const isExpectedRestaurantSetupNotReady = status === 404 && url.includes('/restaurants/my-restaurant');

    // Skip noisy logs for expected API failures.

    if (status === 401) {
      // Only treat as a real session expiry if the user is explicitly on/navigating to a protected page.
      // Background calls (FCM token, /auth/me, socket setup, etc.) should NOT wipe the session.
      const protectedRoutes = ['/checkout', '/orders', '/payment', '/profile', '/auth/logout', '/users/addresses'];
      const isProtectedRequest = protectedRoutes.some(route => url.includes(route));
      const onProtectedPage = isOnProtectedPage();

      // Only clear tokens + redirect when this is a user-facing protected action, not a background call.
      // This prevents register/login flows from being disrupted by background 401s (e.g. FCM token, /auth/me)
      if (isProtectedRequest && onProtectedPage) {
        await clearAuthStorage();

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);


export default instance;
