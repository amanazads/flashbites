import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../../api/authApi';
import { Preferences } from '@capacitor/preferences';
import axios from '../../api/axios';

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
        await Preferences.set({ key: 'accessToken', value: apiResponse.data.accessToken });
        await Preferences.set({ key: 'refreshToken', value: apiResponse.data.refreshToken });
        localStorage.setItem('token', apiResponse.data.accessToken);
        localStorage.setItem('accessToken', apiResponse.data.accessToken);
        localStorage.setItem('refreshToken', apiResponse.data.refreshToken);
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
        await Preferences.set({ key: 'accessToken', value: apiResponse.data.accessToken });
        await Preferences.set({ key: 'refreshToken', value: apiResponse.data.refreshToken });
        localStorage.setItem('token', apiResponse.data.accessToken);
        localStorage.setItem('accessToken', apiResponse.data.accessToken);
        localStorage.setItem('refreshToken', apiResponse.data.refreshToken);
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
      const response = await axios.get('/auth/me');
      return response.data;
    } catch (error) {
      // Don't logout on 401, let the axios interceptor handle it
      return rejectWithValue(error.response?.data);
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem('accessToken') || localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!(localStorage.getItem('accessToken') || localStorage.getItem('token')),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      Preferences.remove({ key: 'token' });
      Preferences.remove({ key: 'accessToken' });
      Preferences.remove({ key: 'refreshToken' });
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    clearError: (state) => {
      state.error = null;
    },
    // Used after registration/Google auth to immediately set auth state in Redux
    setAuthUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
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
        state.refreshToken = action.payload.refreshToken || null;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        // Mark as authenticated whenever we successfully fetch the user
        if (action.payload.user) {
          state.isAuthenticated = true;
        }
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        // Don't set isAuthenticated to false here
      });
  },
});
export const { logout, clearError, setAuthUser, setCredentials } = authSlice.actions;
export default authSlice.reducer;