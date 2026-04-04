import axios from './axios';
import { requestViaFetch, requestViaNativeHttp, shouldFallbackToNativeHttp } from './nativeHttpFallback';

// Register user
export const register = async (userData) => {
  try {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    if (shouldFallbackToNativeHttp(error)) {
      try {
        return await requestViaFetch({
          method: 'POST',
          path: '/auth/register',
          data: userData,
        });
      } catch {
        return await requestViaNativeHttp({
          method: 'POST',
          path: '/auth/register',
          data: userData,
        });
      }
    }
    throw error;
  }
};

// Login user
export const login = async (credentials) => {
  try {
    const response = await axios.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    if (shouldFallbackToNativeHttp(error)) {
      try {
        return await requestViaFetch({
          method: 'POST',
          path: '/auth/login',
          data: credentials,
        });
      } catch {
        return await requestViaNativeHttp({
          method: 'POST',
          path: '/auth/login',
          data: credentials,
        });
      }
    }
    throw error;
  }
};

export const businessLogin = async (credentials) => {
  const response = await axios.post('/auth/business-login', credentials);
  return response.data;
};

export const registerRestaurant = async (payload) => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const response = await axios.post('/auth/register-restaurant', payload, isFormData
    ? {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    : undefined);
  return response.data;
};

export const registerDeliveryPartner = async (payload) => {
  const response = await axios.post('/auth/register-delivery', payload);
  return response.data;
};

// Logout user
export const logout = async () => {
  const response = await axios.post('/auth/logout');
  localStorage.removeItem('token');
  return response.data;
};

// Get current user
export const getMe = async () => {
  const response = await axios.get('/auth/me');
  return response.data;
};

// Alias for consistency
export const getCurrentUser = getMe;

// Update password
export const updatePassword = async (passwords) => {
  const response = await axios.put('/auth/password', passwords);
  return response.data;
};

// Refresh token
export const refreshToken = async (refreshToken) => {
  const response = await axios.post('/auth/refresh', { refreshToken });
  if (response.data.success && response.data.data.accessToken) {
    localStorage.setItem('token', response.data.data.accessToken);
  }
  return response.data;
};
