import axios from './axios';

// Get user profile
export const getProfile = async () => {
  const response = await axios.get('/users/profile');
  return response.data;
};

// Update user profile
export const updateProfile = async (data) => {
  const response = await axios.put('/users/profile', data);
  return response.data;
};

// Get user addresses
export const getAddresses = async () => {
  const response = await axios.get('/users/addresses');
  return response.data;
};

// Add new address
export const addAddress = async (addressData) => {
  const response = await axios.post('/users/addresses', addressData);
  return response.data;
};

// Update address
export const updateAddress = async (addressId, addressData) => {
  const response = await axios.put(`/users/addresses/${addressId}`, addressData);
  return response.data;
};

// Delete address
export const deleteAddress = async (addressId) => {
  const response = await axios.delete(`/users/addresses/${addressId}`);
  return response.data;
};

// Set default address
export const setDefaultAddress = async (addressId) => {
  const response = await axios.patch(`/users/addresses/${addressId}/default`);
  return response.data;
};

// Submit account deletion request
export const submitAccountDeletionRequest = async (payload) => {
  const response = await axios.post('/users/account-deletion-requests', payload);
  return response.data;
};

// Get latest account deletion request status
export const getMyDeletionRequest = async () => {
  const response = await axios.get('/users/account-deletion-requests/me');
  return response.data;
};
