import axios from './axios';

// Create order
export const createOrder = async (orderData) => {
  const response = await axios.post('/orders', orderData);
  return response.data;
};

// Get user orders
export const getUserOrders = async (params = {}) => {
  const response = await axios.get('/orders/my-orders', { params });
  return response.data;
};

// Get order by ID
export const getOrderById = async (id) => {
  const response = await axios.get(`/orders/${id}`);
  return response.data;
};

// Get order tracking
export const getOrderTracking = async (id) => {
  const response = await axios.get(`/orders/${id}/tracking`);
  return response.data;
};

// Update order status
export const updateOrderStatus = async (id, status) => {
  const response = await axios.patch(`/orders/${id}/status`, { status });
  return response.data;
};

// Cancel order
export const cancelOrder = async (id, reason) => {
  const response = await axios.patch(`/orders/${id}/cancel`, { reason });
  return response.data;
};

// Get restaurant orders
export const getRestaurantOrders = async (restaurantId, params = {}) => {
  const response = await axios.get(`/orders/restaurant/${restaurantId}`, { params });
  return response.data;
};

export const orderApi = {
  createOrder,
  getUserOrders,
  getOrderById,
  getOrderTracking,
  updateOrderStatus,
  cancelOrder,
  getRestaurantOrders
};
