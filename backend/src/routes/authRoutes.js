const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { 
  register, 
  login, 
  logout, 
  refreshToken, 
  getMe, 
  updatePassword,
  sendOTP,
  verifyOTP,
  resetPassword
  // googleAuth // Commented out - not using Google OAuth for now
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// OTP routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);
router.post('/reset-password', resetPassword);

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