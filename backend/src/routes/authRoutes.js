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
  resetPassword,
  googleAuth
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

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { 
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?error=${encodeURIComponent('Google authentication failed. Please try again.')}`,
      session: false 
    }, (err, user, info) => {
      if (err) {
        // Handle passport errors
        console.error('Passport authentication error:', err);
        
        let errorMessage = 'Authentication failed. Please try again.';
        
        if (err.code === 11000) {
          // Duplicate key error
          if (err.keyPattern && err.keyPattern.phone) {
            errorMessage = 'This phone number is already registered. Please login with your existing account.';
          } else if (err.keyPattern && err.keyPattern.email) {
            errorMessage = 'This email is already registered. Please login with your existing account.';
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
        return res.redirect(`${frontendURL}/login?error=${encodeURIComponent(errorMessage)}`);
      }
      
      if (!user) {
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
        return res.redirect(`${frontendURL}/login?error=${encodeURIComponent('Authentication failed. No user found.')}`);
      }
      
      // Attach user to request and proceed
      req.user = user;
      next();
    })(req, res, next);
  },
  googleAuth
);

module.exports = router;