import axios from './axios';

export const validateCoupon = async (couponCode, orderValue, restaurantId) => {
  const response = await axios.post('/coupons/validate', {
    code: couponCode,
    orderValue,
    restaurantId
  });
  return response.data;
};

export const getAvailableCoupons = async (orderValue, restaurantId) => {
  const params = new URLSearchParams({ orderValue });
  if (restaurantId) {
    params.append('restaurantId', restaurantId);
  }
  const response = await axios.get(`/coupons/available?${params.toString()}`);
  return response.data;
};
