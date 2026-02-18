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
  timeout: 30000, // Increased to 30 seconds for slower connections
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
      // Use Capacitor Preferences for mobile
      const { value } = await Preferences.get({ key: 'token' });
      token = value;
      if (!token) {
        const { value: accessToken } = await Preferences.get({ key: 'accessToken' });
        token = accessToken;
      }
    } else {
      // Use localStorage for web
      token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    // Log the full error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      baseURL: error.config?.baseURL
    });

    if (error.response?.status === 401) {
      if (isCapacitor) {
        // Clear Capacitor Preferences
        await Preferences.remove({ key: 'token' });
        await Preferences.remove({ key: 'accessToken' });
        await Preferences.remove({ key: 'refreshToken' });
      } else {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
