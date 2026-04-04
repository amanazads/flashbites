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
    // Capacitor bridge can initialize after module eval; preserve native routing in that case.
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

export const getApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();

  if (configured) {
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
