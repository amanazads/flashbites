import axios from './axios';

export const validateCoupon = async (couponCode, orderValue) => {
  const response = await axios.post('/api/coupons/validate', {
    code: couponCode,
    orderValue
  });
  return response.data;
};

export const getAvailableCoupons = async (orderValue) => {
  const response = await axios.get(`/api/coupons/available?orderValue=${orderValue}`);
  return response.data;
};
