const express = require('express');
const router = express.Router();
const {
  createStripePaymentIntent,
  createRazorpayOrder,
  verifyPayment,
  handlePaymentFailure,
  getPaymentByOrderId
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const {
  createPaymentOrderValidator,
  verifyPaymentValidator,
  failPaymentValidator,
  getPaymentByOrderValidator,
} = require('../validators/paymentValidators');

router.use(protect); // All routes require authentication

router.post('/stripe/create-intent', createPaymentOrderValidator, validateRequest, createStripePaymentIntent);
router.post('/razorpay/create-order', createPaymentOrderValidator, validateRequest, createRazorpayOrder);
router.post('/verify', verifyPaymentValidator, validateRequest, verifyPayment);
router.post('/:id/fail', failPaymentValidator, validateRequest, handlePaymentFailure);
router.get('/order/:orderId', getPaymentByOrderValidator, validateRequest, getPaymentByOrderId);

module.exports = router;