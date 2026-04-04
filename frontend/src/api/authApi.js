import axios from './axios';

// Register user
export const register = async (userData) => {
  const response = await axios.post('/auth/register', userData);
  return response.data;
};

// Login user
export const login = async (credentials) => {
  const response = await axios.post('/auth/login', credentials);
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
