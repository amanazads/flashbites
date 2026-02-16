import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../../api/authApi';
import { Preferences } from '@capacitor/preferences';

// Thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const apiResponse = await authApi.login(credentials);
      // apiResponse is { success, message, data: { user, accessToken, refreshToken } }
      // Store tokens in Preferences
      if (apiResponse.success && apiResponse.data) {
        await Preferences.set({ key: 'token', value: apiResponse.data.accessToken });
        await Preferences.set({ key: 'refreshToken', value: apiResponse.data.refreshToken });
      }
      // Return the nested data object which contains user, accessToken, refreshToken
      return apiResponse.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const apiResponse = await authApi.register(userData);
      // apiResponse is { success, message, data: { user, accessToken, refreshToken } }
      // Store tokens in Preferences
      if (apiResponse.success && apiResponse.data) {
        await Preferences.set({ key: 'token', value: apiResponse.data.accessToken });
        await Preferences.set({ key: 'refreshToken', value: apiResponse.data.refreshToken });
      }
      // Return the nested data object which contains user, accessToken, refreshToken
      return apiResponse.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getCurrentUser();
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch user';
      return rejectWithValue(errorMsg);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || localStorage.getItem('accessToken'),
    isAuthenticated: !!(localStorage.getItem('token') || localStorage.getItem('accessToken')),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // Clear tokens from Preferences
      Preferences.remove({ key: 'token' });
      Preferences.remove({ key: 'accessToken' });
      Preferences.remove({ key: 'refreshToken' });
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        console.log('LOGIN FULFILLED - Payload:', action.payload);
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        console.log('LOGIN FULFILLED - State updated:', { 
          user: state.user?.email, 
          token: state.token ? 'exists' : 'missing',
          isAuthenticated: state.isAuthenticated 
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        // Silently fail if user fetch fails - they're still logged in
        // Only log in development
        if (import.meta.env.DEV) {
          console.warn('Failed to fetch current user:', action.payload || action.error?.message);
        }
        // Don't clear auth state - user is still logged in, just couldn't fetch updated data
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;