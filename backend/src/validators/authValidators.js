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
