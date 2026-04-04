import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as restaurantApi from '../../api/restaurantApi';

const buildRestaurantRequestKey = (filters = {}) => {
  const normalized = {
    lat: Number.isFinite(Number(filters?.lat)) ? Number(filters.lat) : null,
    lng: Number.isFinite(Number(filters?.lng)) ? Number(filters.lng) : null,
    radius: Number.isFinite(Number(filters?.radius)) ? Number(filters.radius) : null,
    city: String(filters?.city || '').trim().toLowerCase(),
    zipCode: String(filters?.zipCode || '').trim().toLowerCase(),
    state: String(filters?.state || '').trim().toLowerCase(),
    cuisine: String(filters?.cuisine || '').trim().toLowerCase(),
    search: String(filters?.search || '').trim().toLowerCase(),
  };

  return JSON.stringify(normalized);
};

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
      const hasCoords = Number.isFinite(Number(filters?.lat)) && Number.isFinite(Number(filters?.lng));
      let response;

      if (hasCoords) {
        try {
          response = await withRetry(
            () => restaurantApi.getNearbyRestaurants(
              Number(filters.lat),
              Number(filters.lng),
              Number(filters.radius || 10000),
              Number(filters.limit || 50),
              filters?.city,
              filters?.zipCode,
              filters?.state
            ),
            3,
            4000
          );
        } catch (nearbyError) {
          // Fallback to a broader public listing instead of hard-failing the screen.
          response = await withRetry(
            () => restaurantApi.getRestaurants({
              ...filters,
              lat: undefined,
              lng: undefined,
              radius: undefined,
            }),
            3,
            3000
          );
        }

        const nearbyRestaurants = response?.data?.restaurants || [];
        const city = String(filters?.city || '').trim();

        // Fall back to city-level listing when geo-filtered data is empty but the user selected a known city.
        if (nearbyRestaurants.length === 0 && city) {
          response = await withRetry(
            () => restaurantApi.getRestaurants({
              ...filters,
              lat: undefined,
              lng: undefined,
              radius: undefined,
              city,
            }),
            2,
            2500
          );
        }
      } else {
        response = await withRetry(() => restaurantApi.getRestaurants(filters), 3, 4000);
      }

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
    lastResolvedRequestKey: null,
    activeRequestKey: null,
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
      .addCase(fetchRestaurants.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.activeRequestKey = buildRestaurantRequestKey(action.meta?.arg);
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload?.data?.restaurants || action.payload?.restaurants || [];
        state.lastResolvedRequestKey = buildRestaurantRequestKey(action.meta?.arg);
        state.activeRequestKey = null;
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.lastResolvedRequestKey = buildRestaurantRequestKey(action.meta?.arg);
        state.activeRequestKey = null;
      })
      .addCase(fetchRestaurantById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRestaurant = action.payload?.data?.restaurant || action.payload?.restaurant || null;
      })
      .addCase(fetchRestaurantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, clearFilters } = restaurantSlice.actions;
export default restaurantSlice.reducer;
