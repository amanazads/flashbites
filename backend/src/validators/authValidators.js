const { body } = require('express-validator');

const passwordRule = body('password')
	.isLength({ min: 8, max: 128 })
	.withMessage('Password must be between 8 and 128 characters')
	.matches(/[a-z]/)
	.withMessage('Password must contain at least one lowercase letter')
	.matches(/[A-Z]/)
	.withMessage('Password must contain at least one uppercase letter')
	.matches(/[!@#$%^&*(),.?":{}|<>]/)
	.withMessage('Password must contain at least one special character');

exports.registerValidator = [
	body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
	body('phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
	body('firebaseToken').isString().isLength({ min: 10 }).withMessage('Firebase token is required'),
	body('email').optional({ values: 'falsy' }).isEmail().withMessage('Please provide a valid email'),
	passwordRule,
];

exports.loginValidator = [
	body('phone').optional({ values: 'falsy' }).trim().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
	body('email').optional({ values: 'falsy' }).isEmail().withMessage('Please provide a valid email'),
	body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
	body().custom((payload) => {
		if (!payload.phone && !payload.email) {
			throw new Error('Either phone or email is required');
		}
		return true;
	}),
];

exports.businessLoginValidator = [
	body('phone').optional({ values: 'falsy' }).trim().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
	body('email').optional({ values: 'falsy' }).isEmail().withMessage('Please provide a valid email'),
	body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
	body('expectedRole')
		.isIn(['restaurant_owner', 'delivery_partner'])
		.withMessage('Expected role must be restaurant_owner or delivery_partner'),
	body().custom((payload) => {
		if (!payload.phone && !payload.email) {
			throw new Error('Either phone or email is required');
		}
		return true;
	}),
];

exports.registerRestaurantValidator = [
	body('ownerName').trim().isLength({ min: 2, max: 80 }).withMessage('Owner name must be between 2 and 80 characters'),
	body('restaurantName').trim().isLength({ min: 2, max: 120 }).withMessage('Restaurant name must be between 2 and 120 characters'),
	body('phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
	body('email').isEmail().withMessage('Please provide a valid email'),
	body('password')
		.isLength({ min: 8, max: 128 })
		.withMessage('Password must be between 8 and 128 characters')
		.matches(/[a-z]/)
		.withMessage('Password must contain at least one lowercase letter')
		.matches(/[A-Z]/)
		.withMessage('Password must contain at least one uppercase letter')
		.matches(/[!@#$%^&*(),.?":{}|<>]/)
		.withMessage('Password must contain at least one special character'),
	body('city').trim().isLength({ min: 2, max: 80 }).withMessage('City is required'),
	body('address').trim().isLength({ min: 5, max: 300 }).withMessage('Address is required'),
	body('fssaiLicense').trim().isLength({ min: 5, max: 40 }).withMessage('FSSAI license is required'),
	body('panNumber').trim().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('PAN number is invalid'),
	body('bankAccountNumber').trim().isLength({ min: 8, max: 24 }).withMessage('Bank account number is required'),
	body('bankIfsc').trim().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Valid IFSC code is required'),
	body('bankAccountName').trim().isLength({ min: 2, max: 80 }).withMessage('Bank account holder name is required'),
	body('bankName').trim().isLength({ min: 2, max: 80 }).withMessage('Bank name is required'),
	body('menuDetailsText').trim().isLength({ min: 10, max: 4000 }).withMessage('Menu details are required'),
	body('acceptedPartnerContract').custom((value) => {
		const normalized = String(value).toLowerCase();
		if (!['true', '1', 'yes', 'on'].includes(normalized)) {
			throw new Error('Partner contract terms must be accepted');
		}
		return true;
	}),
	body('contractSignerName').trim().isLength({ min: 2, max: 80 }).withMessage('Contract signer full name is required'),
	body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude is required'),
	body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude is required'),
	body('gstNumber').optional({ values: 'falsy' }).trim().isLength({ min: 5, max: 20 }).withMessage('GST number seems invalid'),
];

exports.registerDeliveryValidator = [
	body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
	body('phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
	body('email').isEmail().withMessage('Please provide a valid email'),
	body('password')
		.isLength({ min: 8, max: 128 })
		.withMessage('Password must be between 8 and 128 characters')
		.matches(/[a-z]/)
		.withMessage('Password must contain at least one lowercase letter')
		.matches(/[A-Z]/)
		.withMessage('Password must contain at least one uppercase letter')
		.matches(/[!@#$%^&*(),.?":{}|<>]/)
		.withMessage('Password must contain at least one special character'),
	body('city').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 80 }).withMessage('City must be between 2 and 80 characters'),
];

exports.refreshTokenValidator = [
	body('refreshToken').isString().isLength({ min: 10 }).withMessage('Refresh token is required'),
];

exports.updatePasswordValidator = [
	body('currentPassword').isString().isLength({ min: 1 }).withMessage('Current password is required'),
	body('newPassword')
		.isLength({ min: 8, max: 128 })
		.withMessage('New password must be between 8 and 128 characters')
		.matches(/[a-z]/)
		.withMessage('New password must contain at least one lowercase letter')
		.matches(/[A-Z]/)
		.withMessage('New password must contain at least one uppercase letter')
		.matches(/[!@#$%^&*(),.?":{}|<>]/)
		.withMessage('New password must contain at least one special character'),
];

exports.resetPasswordValidator = [
	body('phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
	body('firebaseToken').isString().isLength({ min: 10 }).withMessage('Firebase token is required'),
	body('newPassword')
		.isLength({ min: 8, max: 128 })
		.withMessage('Password must be between 8 and 128 characters')
		.matches(/[a-z]/)
		.withMessage('Password must contain at least one lowercase letter')
		.matches(/[A-Z]/)
		.withMessage('Password must contain at least one uppercase letter')
		.matches(/[!@#$%^&*(),.?":{}|<>]/)
		.withMessage('Password must contain at least one special character'),
];
