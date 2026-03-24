import axios from './axios';

// Create Stripe payment intent
export const createStripePaymentIntent = async (orderId) => {
  const response = await axios.post('/payments/stripe/create-intent', { orderId });
  return response.data;
};

// Create Razorpay order
export const createRazorpayOrder = async (orderId, amount) => {
  const response = await axios.post('/payments/razorpay/create-order', { orderId, amount });
  return response.data;
};

// Verify payment
export const verifyPayment = async (paymentData) => {
  const response = await axios.post('/payments/verify', paymentData);
  return response.data;
};

// Record payment failure
export const recordPaymentFailure = async (paymentId, error) => {
  const response = await axios.post(`/payments/${paymentId}/fail`, { error });
  return response.data;
};

// Get payment by order ID
export const getPaymentByOrderId = async (orderId) => {
  const response = await axios.get(`/payments/order/${orderId}`);
  return response.data;
};
