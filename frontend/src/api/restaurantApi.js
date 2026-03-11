import axios from './axios';

// Get all restaurants
export const getRestaurants = async (params = {}) => {
  const response = await axios.get('/restaurants', { params });
  return response.data;
};

// Get restaurant by ID
export const getRestaurantById = async (id) => {
  const response = await axios.get(`/restaurants/${id}`);
  return response.data;
};

// Create restaurant (restaurant owner)
export const createRestaurant = async (restaurantData) => {
  const response = await axios.post('/restaurants', restaurantData);
  return response.data;
};

// Update restaurant
export const updateRestaurant = async (id, restaurantData) => {
  const response = await axios.put(`/restaurants/${id}`, restaurantData);
  return response.data;
};

// Delete restaurant
export const deleteRestaurant = async (id) => {
  const response = await axios.delete(`/restaurants/${id}`);
  return response.data;
};

// Get restaurant stats
export const getRestaurantStats = async (id) => {
  const response = await axios.get(`/restaurants/${id}/stats`);
  return response.data;
};

// Search restaurants
export const searchRestaurants = async (searchTerm) => {
  const response = await axios.get('/restaurants', {
    params: { search: searchTerm }
  });
  return response.data;
};

// Get my restaurant (for restaurant owner)
export const getMyRestaurant = async () => {
  const response = await axios.get('/restaurants/my-restaurant');
  return response.data;
};

// Get restaurant menu items
export const getRestaurantMenuItems = async (restaurantId) => {
  const response = await axios.get(`/restaurants/${restaurantId}/menu`);
  return response.data;
};

// Create menu item
export const createMenuItem = async (restaurantId, itemData) => {
  const response = await axios.post(`/restaurants/${restaurantId}/menu`, itemData);
  return response.data;
};

// Update menu item
export const updateMenuItem = async (restaurantId, itemId, itemData) => {
  const response = await axios.put(`/restaurants/${restaurantId}/menu/${itemId}`, itemData);
  return response.data;
};

// Delete menu item
export const deleteMenuItem = async (restaurantId, itemId) => {
  const response = await axios.delete(`/restaurants/${restaurantId}/menu/${itemId}`);
  return response.data;
};

// Toggle menu item availability
export const toggleMenuItemAvailability = async (restaurantId, itemId) => {
  const response = await axios.patch(`/restaurants/${restaurantId}/menu/${itemId}/availability`);
  return response.data;
};

// Get restaurant analytics
export const getRestaurantAnalytics = async (id, params = {}) => {
  const response = await axios.get(`/restaurants/${id}/analytics`, { params });
  return response.data;
};
