const axios = require('axios');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/tokenUtils');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');
const { sendWelcomeEmail, sendPasswordResetSuccessEmail } = require('../utils/emailService');

// @desc    Register new user (with Firebase Phone OTP verification)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, phone, password, role, email, firebaseToken } = req.body;

    // Validate required fields
    if (!name || !phone || !password || !firebaseToken) {
      return errorResponse(res, 400, 'Name, phone, password, and Firebase verification are required');
    }

    // Verify Firebase ID token
    const decoded = await verifyFirebaseToken(firebaseToken);
    if (!decoded) {
      return errorResponse(res, 401, 'Phone verification failed. Please try again.');
    }

    // Extract phone from Firebase token and compare
    const firebasePhone = decoded.phone_number; // e.g. "+911234567890"
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10); // last 10 digits
    const firebaseNormalized = firebasePhone ? firebasePhone.replace(/\D/g, '').slice(-10) : '';

    if (normalizedPhone !== firebaseNormalized) {
      return errorResponse(res, 400, 'Phone number mismatch. The OTP was sent to a different number.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone: normalizedPhone }).select('+password');
    if (existingUser && existingUser.isPhoneVerified && existingUser.password) {
      return errorResponse(res, 400, 'Phone number already registered. Please login.');
    }



    // Validate role
    const validRoles = ['user', 'restaurant_owner', 'delivery_partner'];
    if (role && !validRoles.includes(role)) {
      return errorResponse(res, 400, 'Invalid role specified');
    }

    let user;
    if (existingUser) {
      // Update existing unverified user
      existingUser.name = name;
      existingUser.password = password;
      existingUser.phone = normalizedPhone;
      existingUser.email = email || null;
      existingUser.role = role || 'user';
      existingUser.isPhoneVerified = true;
      existingUser.otp = null;
      existingUser.otpExpires = null;
      await existingUser.save();
      user = existingUser;
    } else {
      // Create new user
      user = await User.create({
        name,
        phone: normalizedPhone,
        password,
        email: email || null,
        role: role || 'user',
        isPhoneVerified: true,
      });
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Remove password from response
    user.password = undefined;
    user.refreshToken = undefined;

    successResponse(res, 201, 'Registration successful', {
      user,
      accessToken,
      refreshToken
    });

    // Send welcome email in background if email provided
    if (email) {
      sendWelcomeEmail(email, name)
        .catch(err => console.error('Background welcome email failed:', err.message));
    }

  } catch (error) {
    console.error('Registration error:', error);
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const message = field === 'email'
        ? 'This email is already registered. Please use a different email or log in.'
        : field === 'phone'
          ? 'This phone number is already registered. Please log in.'
          : 'An account with this information already exists.';
      return errorResponse(res, 400, message);
    }
    errorResponse(res, 500, 'Registration failed', error.message);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    console.log('===== LOGIN ATTEMPT =====');
    console.log('Phone:', phone, '| Email:', email);

    // Need either phone or email for login
    if ((!phone && !email) || !password) {
      return errorResponse(res, 400, 'Please provide phone/email and password');
    }

    // Find user by phone (primary) or email (fallback)
    let user;
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      user = await User.findOne({ phone: normalizedPhone }).select('+password');
    } else {
      user = await User.findOne({ email }).select('+password');
    }

    if (!user) {
      return errorResponse(res, 404, 'No account found. Please sign up first.');
    }

    console.log('User found:', user.phone || user.email, '| Role:', user.role);

    // Check if user signed up with Google OAuth
    if (user.googleId) {
      return errorResponse(res, 400, 'This account was created using Google Sign-In. Please use Google to login.');
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated');
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return errorResponse(res, 401, 'Invalid credentials');
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
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
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

    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: refreshToken
    });

    if (!user) {
      return errorResponse(res, 401, 'Invalid refresh token');
    }

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

    const user = await User.findById(req.user._id).select('+password');
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

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

// @desc    Reset password with Firebase Phone OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { phone, firebaseToken, newPassword } = req.body;

    if (!phone || !firebaseToken || !newPassword) {
      return errorResponse(res, 400, 'Phone, Firebase verification, and new password are required');
    }

    // Verify Firebase ID token
    const decoded = await verifyFirebaseToken(firebaseToken);
    if (!decoded) {
      return errorResponse(res, 401, 'Phone verification failed. Please try again.');
    }

    // Extract phone from Firebase token and compare
    const firebasePhone = decoded.phone_number;
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    const firebaseNormalized = firebasePhone ? firebasePhone.replace(/\D/g, '').slice(-10) : '';

    if (normalizedPhone !== firebaseNormalized) {
      return errorResponse(res, 400, 'Phone number mismatch.');
    }

    // Find user by phone
    const user = await User.findOne({ phone: normalizedPhone }).select('+password');

    if (!user) {
      return errorResponse(res, 404, 'No account found with this phone number');
    }

    // Update password
    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    user.passwordChangedAt = Date.now();
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    successResponse(res, 200, 'Password reset successful. Please login with your new password.');

    // Send success email in background if email exists
    if (user.email) {
      sendPasswordResetSuccessEmail(user.email, user.name)
        .catch(err => console.error('Background password reset email failed:', err.message));
    }

  } catch (error) {
    errorResponse(res, 500, 'Password reset failed', error.message);
  }
};

// LEGACY: Keep sendOTP and verifyOTP for backward compatibility but they are no longer primary
exports.sendOTP = async (req, res) => {
  return errorResponse(res, 410, 'Email OTP is no longer supported. Please use Firebase Phone OTP.');
};

exports.verifyOTP = async (req, res) => {
  return errorResponse(res, 410, 'Email OTP is no longer supported. Please use Firebase Phone OTP.');
};

// @desc    Google OAuth callback (kept for future use)
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    if (!req.user) {
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendURL}/login?error=${encodeURIComponent('Authentication failed.')}`);
    }

    const user = req.user;
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    user.password = undefined;
    user.refreshToken = undefined;

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendURL}/auth/google/success?token=${accessToken}&refresh=${refreshToken}`);
  } catch (error) {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendURL}/login?error=${encodeURIComponent('Authentication failed.')}`);
  }
};