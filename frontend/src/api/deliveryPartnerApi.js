import axios from './axios';

export const getAvailableOrders = async () => {
  const response = await axios.get('/delivery/orders/available');
  return response.data;
};

export const getAssignedOrders = async () => {
  const response = await axios.get('/delivery/orders/assigned');
  return response.data;
};

export const acceptOrder = async (orderId) => {
  const response = await axios.post(`/delivery/orders/${orderId}/accept`);
  return response.data;
};

export const markAsDelivered = async (orderId, otp) => {
  const response = await axios.post(`/delivery/orders/${orderId}/deliver`, { otp });
  return response.data;
};

export const getOrderHistory = async (page = 1) => {
  const response = await axios.get(`/delivery/orders/history?page=${page}`);
  return response.data;
};

export const getDeliveryStats = async () => {
  const response = await axios.get('/delivery/stats');
  return response.data;
};

export const updateDeliveryLocation = async (latitude, longitude, orderId = null) => {
  const response = await axios.put('/delivery/location', { 
    latitude, 
    longitude,
    ...(orderId && { orderId })
  });
  return response.data;
};

// Notification APIs
export const getNotifications = async (page = 1, unreadOnly = false) => {
  const response = await axios.get('/notifications', {
    params: { page, limit: 20, unreadOnly }
  });
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await axios.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await axios.put('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await axios.delete(`/notifications/${notificationId}`);
  return response.data;
};
