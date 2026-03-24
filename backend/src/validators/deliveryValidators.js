const { body, param, query } = require('express-validator');

exports.orderIdParamValidator = [
  param('orderId').isMongoId().withMessage('Valid orderId is required'),
];

exports.markDeliveredValidator = [
  ...exports.orderIdParamValidator,
  body('otp').optional({ values: 'falsy' }).isString().isLength({ max: 20 }).withMessage('Invalid OTP value'),
];

exports.updateDutyStatusValidator = [
  body('isOnDuty').isBoolean().withMessage('isOnDuty must be boolean'),
];

exports.updateLocationValidator = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('orderId').optional({ values: 'falsy' }).isMongoId().withMessage('orderId must be a valid id'),
];

exports.historyQueryValidator = [
  query('page').optional({ values: 'falsy' }).isInt({ min: 1, max: 100000 }).withMessage('page must be a positive integer'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('timeframe').optional({ values: 'falsy' }).isIn(['day', 'week', 'month', 'all']).withMessage('timeframe must be one of day, week, month, all'),
];
