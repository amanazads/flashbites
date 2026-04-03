import axios from './axios';

export const getDashboardStats = () => {
  return axios.get('/admin/dashboard');
};

export const getAllUsers = (params) => {
  return axios.get('/admin/users', { params });
};

export const getDeliveryPartnerDutyBoard = () => {
  return axios.get('/admin/delivery-partners/duty-board');
};

export const getDeliveryPartnerEarningsControl = () => {
  return axios.get('/admin/delivery-partners/earnings-control');
};

export const updateGlobalDeliveryPartnerEarningsConfig = (payload) => {
  return axios.put('/admin/delivery-partners/earnings-control/global', payload);
};

export const updateDeliveryPartnerEarningsConfig = (partnerId, payload) => {
  return axios.put(`/admin/delivery-partners/${partnerId}/earnings-control`, payload);
};

export const resetAllDeliveryPartnerEarningsOverrides = () => {
  return axios.put('/admin/delivery-partners/earnings-control/reset-all');
};

export const getAllOrders = (params) => {
  return axios.get('/admin/orders', { params });
};

export const getAllRestaurants = (params) => {
  return axios.get('/admin/restaurants', { params });
};

export const saveRestaurantDeliveryZone = (id, coordinates) => {
  return axios.put(`/admin/restaurants/${id}/delivery-zone`, { coordinates });
};

export const getRestaurantOnboardingDetail = (id) => {
  return axios.get(`/admin/restaurants/${id}/onboarding`);
};

export const regenerateRestaurantLoginCredentials = (id) => {
  return axios.post(`/admin/restaurants/${id}/regenerate-login`);
};

export const getDeliveryTrackingDashboard = () => {
  return axios.get('/admin/delivery-tracking');
};

export const approveRestaurant = (id, isApproved) => {
  return axios.patch(`/admin/restaurants/${id}/approve`, { isApproved });
};

export const updateRestaurantPayoutRate = (id, payload) => {
  return axios.patch(`/admin/restaurants/${id}/payout-rate`, payload);
};

export const blockUser = (id, isActive) => {
  return axios.patch(`/admin/users/${id}/block`, { isActive });
};

export const updateUserRole = (id, role) => {
  return axios.patch(`/admin/users/${id}/role`, { role });
};

export const updateUserApproval = (id, payload) => {
  return axios.patch(`/admin/users/${id}/approval`, payload);
};

export const getComprehensiveAnalytics = (params) => {
  return axios.get('/admin/analytics', { params });
};

export const getAccountDeletionRequests = (params) => {
  return axios.get('/admin/account-deletion-requests', { params });
};

export const reviewAccountDeletionRequest = (id, payload) => {
  return axios.patch(`/admin/account-deletion-requests/${id}/review`, payload);
};

export const getPlatformSettings = () => {
  return axios.get('/admin/settings');
};

export const updatePlatformSettings = (payload) => {
  return axios.put('/admin/settings', payload);
};

export const getCoupons = (params) => {
  return axios.get('/admin/coupons', { params });
};

export const createCoupon = (payload) => {
  return axios.post('/admin/coupons', payload);
};

export const updateCoupon = (id, payload) => {
  return axios.put(`/admin/coupons/${id}`, payload);
};

export const deleteCoupon = (id) => {
  return axios.delete(`/admin/coupons/${id}`);
};

// Fee Template APIs
export const getAllFeeTemplates = () => {
  return axios.get('/admin/fee-templates');
};

export const createFeeTemplate = (payload) => {
  return axios.post('/admin/fee-templates', payload);
};

export const updateFeeTemplate = (id, payload) => {
  return axios.put(`/admin/fee-templates/${id}`, payload);
};

export const deleteFeeTemplate = (id) => {
  return axios.delete(`/admin/fee-templates/${id}`);
};

export const assignRestaurantToTemplate = (templateId, restaurantId) => {
  return axios.post(`/admin/fee-templates/${templateId}/assign`, { restaurantId });
};

export const removeRestaurantFromTemplate = (templateId, restaurantId) => {
  return axios.delete(`/admin/fee-templates/${templateId}/restaurants/${restaurantId}`);
};