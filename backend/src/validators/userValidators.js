const { body, param } = require('express-validator');

const addressTypeRule = body('type')
  .optional()
  .isIn(['home', 'work', 'other'])
  .withMessage('Address type must be home, work, or other');

const coordinateArrayRule = body('coordinates')
  .optional()
  .isArray({ min: 2, max: 2 })
  .withMessage('coordinates must contain [lng, lat]');

exports.updateProfileValidator = [
  body('name').optional({ values: 'falsy' }).isString().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('phone').optional({ values: 'falsy' }).matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
  body('avatar').optional({ values: 'falsy' }).isString().isLength({ max: 400 }).withMessage('Avatar URL is too long'),
];

exports.addAddressValidator = [
  addressTypeRule,
  body('street').optional({ values: 'falsy' }).isString().isLength({ max: 200 }).withMessage('Street is too long'),
  body('city').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).withMessage('City is too long'),
  body('state').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).withMessage('State is too long'),
  body('zipCode').optional({ values: 'falsy' }).isString().isLength({ max: 12 }).withMessage('ZIP code is too long'),
  body('landmark').optional({ values: 'falsy' }).isString().isLength({ max: 120 }).withMessage('Landmark is too long'),
  body('fullAddress').optional({ values: 'falsy' }).isString().isLength({ max: 300 }).withMessage('Full address is too long'),
  body('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be a valid latitude'),
  body('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude'),
  coordinateArrayRule,
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean'),
  body().custom((payload) => {
    if (!payload.street && !payload.fullAddress) {
      throw new Error('Provide street or fullAddress');
    }
    return true;
  }),
];

exports.updateAddressValidator = [
  param('id').isMongoId().withMessage('Valid address id is required'),
  ...exports.addAddressValidator,
];

exports.addressIdParamValidator = [
  param('id').isMongoId().withMessage('Valid address id is required'),
];

exports.saveFcmTokenValidator = [
  body('token').isString().isLength({ min: 10, max: 4096 }).withMessage('FCM token is required'),
];

exports.accountDeletionRequestValidator = [
  body('reason').isString().isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters'),
  body('details').optional({ values: 'falsy' }).isString().isLength({ max: 1000 }).withMessage('Details are too long'),
];
