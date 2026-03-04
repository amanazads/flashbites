import axios from './axios';

export const validateCoupon = async (couponCode, orderValue) => {
  const response = await axios.post('/coupons/validate', {
    code: couponCode,
    orderValue
  });
  return response.data;
};

export const getAvailableCoupons = async (orderValue) => {
  const response = await axios.get(`/coupons/available?orderValue=${orderValue}`);
  return response.data;
};
