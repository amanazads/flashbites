const isLocalHost = () => {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const hasNativeLocalhostOrigin = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  return (host === 'localhost' || host === '127.0.0.1') && protocol === 'https:';
};

const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;

  const cap = window.Capacitor;
  if (!cap) {
    return hasNativeLocalhostOrigin() || window.location.protocol === 'capacitor:';
  }

  if (typeof cap.isNativePlatform === 'function') {
    return cap.isNativePlatform();
  }

  if (typeof cap.getPlatform === 'function') {
    return cap.getPlatform() !== 'web';
  }

  return hasNativeLocalhostOrigin() || window.location.protocol === 'capacitor:';
};

const getProductionApiFallback = () => {
  // Keep production fallback deterministic so missing VITE_API_URL does not break web/app auth flows.
  return 'https://flashbites-backend.onrender.com/api';
};

const isLocalApiUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;

  if (raw.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(raw, 'http://localhost');
    const host = String(parsed.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};

export const getApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  const allowLocalApiInProd = String(import.meta.env.VITE_ALLOW_LOCAL_API_IN_PROD || '').toLowerCase() === 'true';

  if (configured) {
    if (!import.meta.env.DEV && !allowLocalApiInProd && isLocalApiUrl(configured)) {
      return getProductionApiFallback();
    }
    return configured;
  }

  // In production builds (web or native), always prefer the stable remote backend fallback.
  // This avoids startup races where native bridge detection may lag and accidentally lock API to localhost.
  if (!import.meta.env.DEV) {
    return getProductionApiFallback();
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
