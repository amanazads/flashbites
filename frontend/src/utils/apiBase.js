const isLocalHost = () => {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

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

const getProductionApiFallback = () => {
  // Keep production fallback deterministic so missing VITE_API_URL does not break web/app auth flows.
  return 'https://flashbites-backend.onrender.com/api';
};

export const getApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();

  if (configured) {
    return configured;
  }

  if (import.meta.env.DEV && isLocalHost()) {
    return '/api';
  }

  if (isNativePlatform()) {
    return getProductionApiFallback();
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('flashbites.in')) {
      return getProductionApiFallback();
    }
  }

  return 'http://localhost:8080/api';
};

export const getSocketBaseUrl = () => {
  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl.replace(/\/api\/?$/, '') || window.location.origin;
};
