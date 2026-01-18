import axios from './axios';

export const getAvailableOrders = async () => {
  const response = await axios.get('/api/delivery/orders/available');
  return response.data;
};

export const getAssignedOrders = async () => {
  const response = await axios.get('/api/delivery/orders/assigned');
  return response.data;
};

export const acceptOrder = async (orderId) => {
  const response = await axios.post(`/api/delivery/orders/${orderId}/accept`);
  return response.data;
};

export const markAsDelivered = async (orderId, otp) => {
  const response = await axios.post(`/api/delivery/orders/${orderId}/deliver`, { otp });
  return response.data;
};

export const getOrderHistory = async (page = 1) => {
  const response = await axios.get(`/api/delivery/orders/history?page=${page}`);
  return response.data;
};

export const getDeliveryStats = async () => {
  const response = await axios.get('/api/delivery/stats');
  return response.data;
};

export const updateDeliveryLocation = async (latitude, longitude, orderId = null) => {
  const response = await axios.put('/api/delivery/location', { 
    latitude, 
    longitude,
    ...(orderId && { orderId })
  });
  return response.data;
};
