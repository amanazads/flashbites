const { body, param } = require('express-validator');

exports.createPaymentOrderValidator = [
  body('orderId').isMongoId().withMessage('Valid orderId is required'),
  body('amount').optional().isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
];

exports.verifyPaymentValidator = [
  body('paymentId').isMongoId().withMessage('Valid paymentId is required'),
  body('gateway').isIn(['razorpay', 'stripe']).withMessage('Unsupported payment gateway'),
  body('gatewayResponse').isObject().withMessage('gatewayResponse must be an object'),
];

exports.failPaymentValidator = [
  param('id').isMongoId().withMessage('Valid payment id is required'),
];

exports.getPaymentByOrderValidator = [
  param('orderId').isMongoId().withMessage('Valid orderId is required'),
];