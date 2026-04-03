const isLocalHost = () => {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL;

  if (import.meta.env.DEV && isLocalHost()) {
    return '/api';
  }

  return configured || 'http://localhost:8080/api';
};

export const getSocketBaseUrl = () => {
  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl.replace(/\/api\/?$/, '') || window.location.origin;
};
