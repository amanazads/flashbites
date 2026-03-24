const { body, param } = require('express-validator');

exports.createOrderValidator = [
	body('restaurantId').isMongoId().withMessage('Valid restaurantId is required'),
	body('addressId').optional({ values: 'falsy' }).isMongoId().withMessage('addressId must be a valid id'),
	body('paymentMethod').optional().isIn(['cod', 'card', 'upi']).withMessage('Invalid payment method'),
	body('couponCode').optional({ values: 'falsy' }).isString().isLength({ min: 2, max: 40 }).withMessage('Invalid coupon code'),
	body('deliveryInstructions').optional({ values: 'falsy' }).isString().isLength({ max: 300 }).withMessage('Delivery instructions are too long'),
	body('items').isArray({ min: 1, max: 50 }).withMessage('Order must contain at least one item'),
	body('items.*.menuItemId').isMongoId().withMessage('Each item requires a valid menuItemId'),
	body('items.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Each item quantity must be between 1 and 100'),
	body('items.*.variantName').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).withMessage('variantName is too long'),
	body('deliveryAddress').optional().isObject().withMessage('deliveryAddress must be an object'),
	body('deliveryAddress.street').optional({ values: 'falsy' }).isString().isLength({ max: 200 }).withMessage('street is too long'),
	body('deliveryAddress.city').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).withMessage('city is too long'),
	body('deliveryAddress.state').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).withMessage('state is too long'),
	body('deliveryAddress.zipCode').optional({ values: 'falsy' }).isString().isLength({ max: 12 }).withMessage('zipCode is too long'),
	body('deliveryAddress.fullAddress').optional({ values: 'falsy' }).isString().isLength({ max: 300 }).withMessage('fullAddress is too long'),
	body('deliveryAddress.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('deliveryAddress.lat must be valid latitude'),
	body('deliveryAddress.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('deliveryAddress.lng must be valid longitude'),
	body('deliveryAddress.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('deliveryAddress.coordinates must contain [lng, lat]'),
	body().custom((payload) => {
		if (!payload.addressId && !payload.deliveryAddress) {
			throw new Error('Either addressId or deliveryAddress is required');
		}
		return true;
	}),
];

exports.updateOrderStatusValidator = [
	param('id').isMongoId().withMessage('Valid order id is required'),
	body('status')
		.isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
		.withMessage('Invalid order status'),
	body('reason').optional({ values: 'falsy' }).isString().isLength({ min: 3, max: 200 }).withMessage('Reason must be 3-200 characters'),
];

exports.cancelOrderValidator = [
	param('id').isMongoId().withMessage('Valid order id is required'),
	body('reason').optional({ values: 'falsy' }).isString().isLength({ min: 3, max: 200 }).withMessage('Reason must be 3-200 characters'),
];
