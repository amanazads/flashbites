const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/tokenUtils');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { generateOTP, sendOTPEmail, sendWelcomeEmail, sendPasswordResetSuccessEmail } = require('../utils/emailService');
const crypto = require('crypto');

// @desc    Send OTP for registration
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body; // purpose: 'registration' or 'forgot-password'

    if (!email) {
      return errorResponse(res, 400, 'Email is required');
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    
    if (purpose === 'registration') {
      // Allow OTP resend only if user is not fully registered (temp user)
      if (existingUser && existingUser.isEmailVerified) {
        return errorResponse(res, 400, 'Email already registered');
      }
      // If temp user exists but not verified, we'll update it (allow retry)
    }

    if (purpose === 'forgot-password' && (!existingUser || !existingUser.isEmailVerified)) {
      return errorResponse(res, 404, 'No account found with this email');
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (purpose === 'forgot-password') {
      // Update existing user
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      await existingUser.save({ validateBeforeSave: false });
    } else {
      // For registration, create or update temp user
      // This allows users to retry with the same email if they didn't complete registration
      const tempUser = await User.findOneAndUpdate(
        { email },
        { 
          email,
          otp,
          otpExpires,
          isEmailVerified: false,
          password: 'temp123' // Will be updated during registration
        },
        { upsert: true, new: true }
      );
    }

    // Send success response immediately
    successResponse(res, 200, 'OTP sent successfully to your email', { 
      email,
      expiresIn: '10 minutes'
    });

    // Send OTP email asynchronously in background (don't await)
    sendOTPEmail(email, otp, purpose === 'registration' ? 'verification' : 'reset')
      .catch(err => console.error('Background email send failed:', err.message));

  } catch (error) {
    errorResponse(res, 500, 'Failed to send OTP', error.message);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return errorResponse(res, 400, 'Email and OTP are required');
    }

    // Find user with this email and OTP
    const user = await User.findOne({ 
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired OTP');
    }

    successResponse(res, 200, 'OTP verified successfully', { 
      email,
      verified: true
    });
  } catch (error) {
    errorResponse(res, 500, 'OTP verification failed', error.message);
  }
};

// @desc    Register new user (with OTP verification)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role, otp } = req.body;

    // Verify OTP first
    const userWithOTP = await User.findOne({ 
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!userWithOTP) {
      return errorResponse(res, 400, 'Invalid or expired OTP. Please request a new OTP.');
    }

    // Check if already fully registered
    if (userWithOTP.isEmailVerified && userWithOTP.password !== 'temp123') {
      return errorResponse(res, 400, 'User already exists with this email');
    }

    // Check phone number
    const existingPhone = await User.findOne({ phone, _id: { $ne: userWithOTP._id } });
    if (existingPhone) {
      return errorResponse(res, 400, 'Phone number already registered');
    }

    // Validate role
    const validRoles = ['user', 'restaurant_owner'];
    if (role && !validRoles.includes(role)) {
      return errorResponse(res, 400, 'Invalid role specified');
    }

    // Update user with full details
    userWithOTP.name = name;
    userWithOTP.password = password;
    userWithOTP.phone = phone;
    userWithOTP.role = role || 'user';
    userWithOTP.isEmailVerified = true;
    userWithOTP.otp = null;
    userWithOTP.otpExpires = null;
    
    await userWithOTP.save();

    // Generate tokens
    const accessToken = generateToken(userWithOTP._id);
    const refreshToken = generateRefreshToken(userWithOTP._id);

    // Save refresh token
    userWithOTP.refreshToken = refreshToken;
    await userWithOTP.save({ validateBeforeSave: false });

    // Remove password from response
    userWithOTP.password = undefined;
    userWithOTP.refreshToken = undefined;

    successResponse(res, 201, 'Registration successful', {
      user: userWithOTP,
      accessToken,
      refreshToken
    });

    // Send welcome email in background (don't await)
    sendWelcomeEmail(email, name)
      .catch(err => console.error('Background welcome email failed:', err.message));

  } catch (error) {
    errorResponse(res, 500, 'Registration failed', error.message);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('===== LOGIN ATTEMPT =====');
    console.log('Email:', email);
    console.log('Password provided:', password ? 'Yes' : 'No');

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: Missing email or password');
      return errorResponse(res, 400, 'Please provide email and password');
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('User not found for email:', email);
      return errorResponse(res, 404, 'No account found with this email. Please sign up first.');
    }

    console.log('User found:', user.email, '| Role:', user.role, '| Active:', user.isActive, '| Google OAuth:', !!user.googleId);

    // Check if user signed up with Google OAuth
    if (user.googleId) {
      console.log('User signed up with Google OAuth, cannot use email/password login');
      return errorResponse(res, 400, 'This account was created using Google Sign-In. Please use "Continue with Google" to login.');
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('User account is not active');
      return errorResponse(res, 403, 'Your account has been deactivated');
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    console.log('Password match:', isPasswordCorrect);

    if (!isPasswordCorrect) {
      console.log('Password verification failed');
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Remove sensitive fields
    user.password = undefined;
    user.refreshToken = undefined;

    successResponse(res, 200, 'Login successful', {
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    errorResponse(res, 500, 'Login failed', error.message);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Clear refresh token from database
    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: null
    });

    successResponse(res, 200, 'Logout successful');
  } catch (error) {
    errorResponse(res, 500, 'Logout failed', error.message);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, 'Refresh token is required');
    }

    const { verifyRefreshToken } = require('../utils/tokenUtils');
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return errorResponse(res, 401, 'Invalid or expired refresh token');
    }

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: refreshToken
    });

    if (!user) {
      return errorResponse(res, 401, 'Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateToken(user._id);

    successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken
    });
  } catch (error) {
    errorResponse(res, 500, 'Token refresh failed', error.message);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken');

    successResponse(res, 200, 'User retrieved successfully', { user });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get user', error.message);
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Please provide current and new password');
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Generate new tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    successResponse(res, 200, 'Password updated successfully', {
      accessToken,
      refreshToken
    });
  } catch (error) {
    errorResponse(res, 500, 'Password update failed', error.message);
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return errorResponse(res, 400, 'Email, OTP, and new password are required');
    }

    // Find user with valid OTP
    const user = await User.findOne({ 
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired OTP');
    }

    // Update password
    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    user.passwordChangedAt = Date.now();
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    // Send success response immediately
    successResponse(res, 200, 'Password reset successful. Please login with your new password.');

    // Send success email in background (don't await)
    sendPasswordResetSuccessEmail(email, user.name)
      .catch(err => console.error('Background password reset email failed:', err.message));

  } catch (error) {
    errorResponse(res, 500, 'Password reset failed', error.message);
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    // Check if authentication failed
    if (!req.user) {
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendURL}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
    }

    // This will be handled by passport middleware
    // User will be attached to req.user by passport
    const user = req.user;

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Remove sensitive fields
    user.password = undefined;
    user.refreshToken = undefined;

    // Redirect to frontend with tokens
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendURL}/auth/google/success?token=${accessToken}&refresh=${refreshToken}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    // Handle specific error types
    let errorMessage = 'Authentication failed. Please try again.';
    
    if (error.code === 11000) {
      // Duplicate key error
      if (error.keyPattern && error.keyPattern.phone) {
        errorMessage = 'This phone number is already registered. Please login with your existing account or use a different phone number.';
      } else if (error.keyPattern && error.keyPattern.email) {
        errorMessage = 'This email is already registered. Please login with your existing account.';
      }
    }
    
    res.redirect(`${frontendURL}/login?error=${encodeURIComponent(errorMessage)}`);
  }
};