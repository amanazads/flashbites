const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/responseHandler');
// Initialize Stripe only if credentials are provided
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const Razorpay = require('razorpay');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';

const isLiveRazorpayKey = (key) => typeof key === 'string' && key.startsWith('rzp_live_');

// Initialize Razorpay only if credentials are provided
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET 
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

const approximatelyEqual = (a, b, tolerance = 0.5) => Math.abs(Number(a) - Number(b)) <= tolerance;

const getAndAuthorizeOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId).select('userId total paymentStatus status');
  if (!order) {
    return { error: { code: 404, message: 'Order not found' } };
  }

  if (String(order.userId) !== String(userId)) {
    return { error: { code: 403, message: 'Not authorized for this order' } };
  }

  return { order };
};

// @desc    Create Stripe payment intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
exports.createStripePaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return errorResponse(res, 503, 'Stripe payment gateway not configured');
    }

    const { orderId, amount } = req.body;

    const { order, error } = await getAndAuthorizeOrder(orderId, req.user._id);
    if (error) {
      return errorResponse(res, error.code, error.message);
    }

    if (amount !== undefined && !approximatelyEqual(order.total, amount)) {
      return errorResponse(res, 400, 'Payment amount does not match order total');
    }

    const payableAmount = Number(order.total);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payableAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: { orderId: orderId.toString(), userId: req.user._id.toString() }
    });

    // Create payment record
    const payment = await Payment.create({
      orderId,
      userId: req.user._id,
      amount: payableAmount,
      method: 'card',
      gateway: 'stripe',
      transactionId: paymentIntent.id,
      status: 'pending'
    });

    successResponse(res, 200, 'Payment intent created', {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to create payment intent', error.message);
  }
};

// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay/create-order
// @access  Private
exports.createRazorpayOrder = async (req, res) => {
  try {
    console.log('💳 Creating Razorpay order...');

    if (isProduction && !isLiveRazorpayKey(razorpayKeyId)) {
      return errorResponse(res, 503, 'Razorpay live key is not configured for production');
    }
    
    // Check if Razorpay is configured
    if (!razorpay) {
      return errorResponse(res, 503, 'Payment gateway not configured. Please contact support.');
    }
    
    const { orderId, amount } = req.body;

    const { order, error } = await getAndAuthorizeOrder(orderId, req.user._id);
    if (error) {
      return errorResponse(res, error.code, error.message);
    }

    if (amount !== undefined && !approximatelyEqual(order.total, amount)) {
      return errorResponse(res, 400, 'Payment amount does not match order total');
    }

    const payableAmount = Number(order.total);
    
    console.log('Order ID:', orderId);
    console.log('Amount:', payableAmount);

    if (!orderId || payableAmount <= 0) {
      console.error('❌ Missing required fields');
      return errorResponse(res, 400, 'Order ID is required and order total must be valid');
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: orderId.toString(),
      notes: {
        orderId: orderId.toString(),
        userId: req.user._id.toString()
      }
    });

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    // Create payment record
    const payment = await Payment.create({
      orderId,
      userId: req.user._id,
      amount: payableAmount,
      method: 'upi',
      gateway: 'razorpay',
      transactionId: razorpayOrder.id,
      status: 'pending'
    });

    console.log('💾 Payment record created:', payment._id);

    successResponse(res, 200, 'Razorpay order created', {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('❌ Razorpay order creation failed:', error);
    console.error('Error details:', error.error || error.message);
    errorResponse(res, 500, 'Failed to create Razorpay order', error.message);
  }
};

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    console.log('🔍 Payment verification request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { paymentId, gateway, gatewayResponse } = req.body;

    if (!paymentId) {
      console.error('❌ Missing paymentId in request');
      return errorResponse(res, 400, 'Payment ID is required');
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      console.error(`❌ Payment not found for ID: ${paymentId}`);
      return errorResponse(res, 404, 'Payment not found');
    }

    if (String(payment.userId) !== String(req.user._id)) {
      return errorResponse(res, 403, 'Not authorized for this payment');
    }

    if (payment.status === 'success') {
      return successResponse(res, 200, 'Payment already verified', { payment });
    }

    console.log('📄 Payment record found:', payment._id);

    // Verify Razorpay signature if gateway is Razorpay
    if (gateway === 'razorpay' && gatewayResponse) {
      // Check if Razorpay is configured
      if (!process.env.RAZORPAY_KEY_SECRET) {
        return errorResponse(res, 503, 'Payment gateway not configured. Please contact support.');
      }
      
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayResponse;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return errorResponse(res, 400, 'Incomplete Razorpay response payload');
      }

      if (isProduction && !isLiveRazorpayKey(razorpayKeyId)) {
        return errorResponse(res, 503, 'Razorpay live key is not configured for production');
      }

      if (payment.transactionId && payment.transactionId !== razorpay_order_id) {
        console.error('❌ Razorpay order ID mismatch with payment record');
        return errorResponse(res, 400, 'Payment order mismatch');
      }
      
      console.log('🔐 Verifying Razorpay signature...');
      console.log('Order ID:', razorpay_order_id);
      console.log('Payment ID:', razorpay_payment_id);
      
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('❌ Razorpay signature verification failed');
        console.error('Expected:', expectedSignature);
        console.error('Received:', razorpay_signature);
        return errorResponse(res, 400, 'Invalid payment signature');
      }
      
      console.log('✅ Razorpay signature verified successfully');
    }

    // Update payment status
    payment.status = 'success';
    payment.gatewayResponse = gatewayResponse;
    await payment.save();
    console.log('💾 Payment status updated to success');

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      if (String(order.userId) !== String(req.user._id)) {
        return errorResponse(res, 403, 'Not authorized for this order payment');
      }

      if (!approximatelyEqual(order.total, payment.amount)) {
        return errorResponse(res, 400, 'Payment amount mismatch with order total');
      }

      order.paymentStatus = 'completed';
      // Don't auto-confirm - restaurant needs to confirm manually
      // Order stays in 'pending' status until restaurant confirms
      await order.save();
      console.log(`✅ Order ${order._id} payment completed. Status: ${order.status} (waiting for restaurant confirmation)`);
    } else {
      console.warn('⚠️ Order not found for payment');
    }

    successResponse(res, 200, 'Payment verified successfully', { payment, order });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    console.error('Error stack:', error.stack);
    errorResponse(res, 500, 'Payment verification failed', error.message);
  }
};

// @desc    Handle payment failure
// @route   POST /api/payments/:id/fail
// @access  Private
exports.handlePaymentFailure = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return errorResponse(res, 404, 'Payment not found');
    }

    if (String(payment.userId) !== String(req.user._id)) {
      return errorResponse(res, 403, 'Not authorized for this payment');
    }

    payment.status = 'failed';
    payment.gatewayResponse = req.body.error;
    await payment.save();

    // Optionally cancel the order
    const order = await Order.findById(payment.orderId);
    if (order && order.status === 'pending') {
      order.status = 'cancelled';
      order.cancellationReason = 'Payment failed';
      await order.save();
    }

    successResponse(res, 200, 'Payment failure recorded', { payment });
  } catch (error) {
    errorResponse(res, 500, 'Failed to handle payment failure', error.message);
  }
};

// @desc    Get payment by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrderId = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user._id
    });

    if (!payment) {
      return errorResponse(res, 404, 'Payment not found');
    }

    successResponse(res, 200, 'Payment retrieved successfully', { payment });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get payment', error.message);
  }
};