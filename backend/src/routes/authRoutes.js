const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { 
  register, 
  registerRestaurant,
  registerDeliveryPartner,
  login, 
  logout, 
  refreshToken, 
  getPhoneAuthStatus,
  getMe, 
  updatePassword,
  sendOTP,
  verifyOTP,
  resetPassword
  // googleAuth // Commented out - not using Google OAuth for now
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateRequest = require('../middleware/validateRequest');
const {
  registerValidator,
  registerRestaurantValidator,
  registerDeliveryValidator,
  loginValidator,
  businessLoginValidator,
  refreshTokenValidator,
  updatePasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidators');

// OTP routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Auth routes
router.post('/register', registerValidator, validateRequest, register);
router.post(
  '/register-restaurant',
  upload.fields([
    { name: 'panCard', maxCount: 1 },
    { name: 'fssaiDocument', maxCount: 1 },
    { name: 'menuDocument', maxCount: 1 },
    { name: 'menuImage', maxCount: 1 },
    { name: 'profileFoodImage', maxCount: 1 }
  ]),
  registerRestaurantValidator,
  validateRequest,
  registerRestaurant
);
router.post('/register-delivery', registerDeliveryValidator, validateRequest, registerDeliveryPartner);
router.post('/login', loginValidator, validateRequest, login);
router.post('/business-login', businessLoginValidator, validateRequest, login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshTokenValidator, validateRequest, refreshToken);
router.get('/phone-status', getPhoneAuthStatus);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePasswordValidator, validateRequest, updatePassword);
router.post('/reset-password', resetPasswordValidator, validateRequest, resetPassword);

// Google OAuth routes - COMMENTED OUT
// router.get('/google', 
//   passport.authenticate('google', { 
//     scope: ['profile', 'email'] 
//   })
// );

// router.get('/google/callback',
//   (req, res, next) => {
//     console.log('🔵 Google callback route hit');
//     passport.authenticate('google', { 
//       failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?error=${encodeURIComponent('Google authentication failed. Please try again.')}`,
//       session: false 
//     }, (err, user, info) => {
//       if (err) {
//         // Handle passport errors
//         console.error('❌ Passport authentication error:', err);
//         console.error('Error code:', err.code);
//         console.error('Error keyPattern:', err.keyPattern);
//         
//         let errorMessage = 'Authentication failed. Please try again.';
//         
//         if (err.code === 11000) {
//           // Duplicate key error
//           if (err.keyPattern && err.keyPattern.phone) {
//             errorMessage = 'This phone number is already registered. Please login with your existing account.';
//             console.log('⚠️ Duplicate phone error');
//           } else if (err.keyPattern && err.keyPattern.email) {
//             errorMessage = 'This email is already registered. Please login with your existing account.';
//             console.log('⚠️ Duplicate email error');
//           }
//         } else if (err.message) {
//           errorMessage = err.message;
//         }
//         
//         const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
//         console.log('🔄 Redirecting to login with error:', errorMessage);
//         return res.redirect(`${frontendURL}/login?error=${encodeURIComponent(errorMessage)}`);
//       }
//       
//       if (!user) {
//         console.error('❌ No user returned from passport');
//         console.log('Info:', info);
//         const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
//         return res.redirect(`${frontendURL}/login?error=${encodeURIComponent('Authentication failed. No user found.')}`);
//       }
//       
//       console.log('✅ User authenticated in passport middleware:', user.email);
//       // Attach user to request and proceed
//       req.user = user;
//       next();
//     })(req, res, next);
//   },
//   googleAuth
// );

module.exports = router;