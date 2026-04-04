import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getApiBaseUrl } from '../utils/apiBase';

const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;

  const cap = window.Capacitor || Capacitor;
  if (!cap) return false;

  if (typeof cap.isNativePlatform === 'function') {
    return cap.isNativePlatform();
  }

  if (typeof cap.getPlatform === 'function') {
    return cap.getPlatform() !== 'web';
  }

  const host = window.location.hostname;
  const protocol = window.location.protocol;
  return (host === 'localhost' || host === '127.0.0.1') && protocol === 'https:';
};

const buildApiUrl = (path) => {
  const base = String(getApiBaseUrl() || '').replace(/\/$/, '');
  const normalizedPath = String(path || '').replace(/^\//, '');
  return `${base}/${normalizedPath}`;
};

const parseFetchBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: text };
  }
};

export const shouldFallbackToNativeHttp = (error) => {
  if (!isNativePlatform()) return false;
  if (error?.response) return false;

  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code.includes('err_network')
    || code.includes('econnaborted')
    || message.includes('network error')
    || message.includes('timeout')
    || message.includes('failed to fetch')
  );
};

export const requestViaFetch = async ({ method = 'GET', path, params, data, headers }) => {
  const url = new URL(buildApiUrl(path));

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: method.toUpperCase() === 'GET' ? undefined : JSON.stringify(data || {}),
  });

  const parsed = await parseFetchBody(response);
  if (!response.ok) {
    const message = parsed?.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.response = { status: response.status, data: parsed };
    throw error;
  }

  return parsed;
};

export const requestViaNativeHttp = async ({ method = 'GET', path, params, data, headers }) => {
  if (!CapacitorHttp || typeof CapacitorHttp.request !== 'function') {
    throw new Error('Native HTTP transport is unavailable');
  }

  const response = await CapacitorHttp.request({
    url: buildApiUrl(path),
    method,
    params,
    data,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    connectTimeout: 60000,
    readTimeout: 60000,
  });

  return response?.data;
};
