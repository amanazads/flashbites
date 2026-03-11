import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as restaurantApi from '../../api/restaurantApi';

// Retry helper — retries up to maxRetries times with delay between attempts
const withRetry = async (fn, maxRetries = 3, delayMs = 3000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`fetchRestaurants attempt ${attempt}/${maxRetries} failed:`, err?.message);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

export const fetchRestaurants = createAsyncThunk(
  'restaurant/fetchRestaurants',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await withRetry(() => restaurantApi.getRestaurants(filters), 3, 4000);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load restaurants');
    }
  }
);


export const fetchRestaurantById = createAsyncThunk(
  'restaurant/fetchRestaurantById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await restaurantApi.getRestaurantById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: {
    restaurants: [],
    currentRestaurant: null,
    loading: false,
    error: null,
    filters: {
      cuisine: null,
      rating: null,
      search: '',
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { cuisine: null, rating: null, search: '' };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload.restaurants;
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRestaurantById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRestaurant = action.payload.restaurant;
      })
      .addCase(fetchRestaurantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, clearFilters } = restaurantSlice.actions;
export default restaurantSlice.reducer;