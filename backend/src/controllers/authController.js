const axios = require('axios');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const PushSubscription = require('../models/PushSubscription');
const cloudinary = require('../config/cloudinary');
const { ensureAllowedFile } = require('../utils/fileValidation');
const { generateToken, generateRefreshToken, hashRefreshToken } = require('../utils/tokenUtils');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');
const { sendWelcomeEmail, sendPasswordResetSuccessEmail, sendContactEmail } = require('../utils/emailService');

const storeRefreshTokenHash = async (user, rawRefreshToken) => {
  user.refreshToken = hashRefreshToken(rawRefreshToken);
  await user.save({ validateBeforeSave: false });
};

const isBusinessRole = (role) => role === 'restaurant_owner' || role === 'delivery_partner';

const uploadOnboardingFile = (file, folder) => new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: 'auto'
    },
    (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        url: result.secure_url,
        cloudinaryId: result.public_id,
        fileName: file.originalname,
        mimeType: file.mimetype
      });
    }
  );

  uploadStream.end(file.buffer);
});

// @desc    Register new user (with Firebase Phone OTP verification)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, phone, password, email, firebaseToken } = req.body;
    const normalizedEmail = typeof email === 'string'
      ? email.trim().toLowerCase()
      : '';
    const hasValidEmail = !!normalizedEmail && normalizedEmail !== 'undefined' && normalizedEmail !== 'null';

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
    let user;
    if (existingUser) {
      // Update existing unverified user
      existingUser.name = name;
      existingUser.password = password;
      existingUser.phone = normalizedPhone;
      if (hasValidEmail) {
        existingUser.email = normalizedEmail;
      }
      existingUser.role = existingUser.role === 'admin' ? 'admin' : 'user';
      existingUser.isPhoneVerified = true;
      existingUser.otp = null;
      existingUser.otpExpires = null;
      await existingUser.save();
      user = existingUser;
    } else {
      // Create new user
      const userData = {
        name,
        phone: normalizedPhone,
        password,
        role: 'user',
        isPhoneVerified: true,
      };

      if (hasValidEmail) {
        userData.email = normalizedEmail;
      }

      user = await User.create(userData);
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    await storeRefreshTokenHash(user, refreshToken);

    // Remove password from response
    user.password = undefined;
    user.refreshToken = undefined;

    successResponse(res, 201, 'Registration successful', {
      user,
      accessToken,
      refreshToken
    });

    // Send welcome email in background if email provided
    if (hasValidEmail) {
      sendWelcomeEmail(normalizedEmail, name)
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
    const { phone, email, password, expectedRole } = req.body;

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
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      user = await User.findOne({ email: normalizedEmail }).select('+password');
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

    if (expectedRole && user.role !== expectedRole) {
      return errorResponse(res, 403, 'Please use the correct login portal for your account type.');
    }

    if (isBusinessRole(user.role)) {
      // Re-fetch fresh user data to ensure latest approval status
      const freshUser = await User.findById(user._id).select('+password');
      if (freshUser) {
        user = freshUser;
      }

      if (user.approvalStatus !== 'approved') {
        if (user.approvalStatus === 'rejected') {
          const reason = user.approvalNote ? ` Reason: ${user.approvalNote}` : '';
          return errorResponse(res, 403, `Your account has been rejected by admin.${reason}`);
        }

        const pendingReason = user.approvalNote ? ` Note: ${user.approvalNote}` : '';
        return errorResponse(res, 403, `Your account is pending admin approval.${pendingReason}`);
      }
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
    await storeRefreshTokenHash(user, refreshToken);

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

// @desc    Register restaurant owner account
// @route   POST /api/auth/register-restaurant
// @access  Public
exports.registerRestaurant = async (req, res) => {
  try {
    const {
      ownerName,
      restaurantName,
      phone,
      email,
      password,
      city,
      address,
      fssaiLicense,
      panNumber,
      gstNumber,
      cuisine,
      bankAccountNumber,
      bankIfsc,
      bankAccountName,
      bankName,
      menuDetailsText,
      acceptedPartnerContract,
      contractSignerName,
      lat,
      lng
    } = req.body;

    const contractAccepted = ['true', '1', 'yes', 'on'].includes(String(acceptedPartnerContract || '').toLowerCase());
    if (!contractAccepted) {
      return errorResponse(res, 400, 'Partner contract acceptance is required');
    }

    const requiredDocKeys = ['panCard', 'fssaiDocument', 'menuImage', 'profileFoodImage'];
    const missingDocs = requiredDocKeys.filter((key) => !req.files?.[key]?.[0]);
    if (missingDocs.length > 0) {
      return errorResponse(res, 400, `Missing required documents: ${missingDocs.join(', ')}`);
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return errorResponse(res, 400, 'Valid restaurant map location is required');
    }

    const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPan = String(panNumber || '').trim().toUpperCase();
    const normalizedIfsc = String(bankIfsc || '').trim().toUpperCase();
    const normalizedGst = String(gstNumber || '').trim().toUpperCase();
    const loginReferenceId = `RB-${normalizedPhone.slice(-4)}-${Date.now().toString().slice(-6)}`;

    const onboardingDocuments = {};
    for (const [field, folder, allowedMimeTypes] of [
      ['panCard', 'flashbites/restaurants/pan', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']],
      ['fssaiDocument', 'flashbites/restaurants/fssai', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']],
      ['menuDocument', 'flashbites/restaurants/menu-docs', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']],
      ['menuImage', 'flashbites/restaurants/menu-images', ['image/jpeg', 'image/png', 'image/webp']],
      ['profileFoodImage', 'flashbites/restaurants/profile-food', ['image/jpeg', 'image/png', 'image/webp']]
    ]) {
      const file = req.files?.[field]?.[0];
      if (file) {
        ensureAllowedFile(file, allowedMimeTypes, field);
        onboardingDocuments[field] = await uploadOnboardingFile(file, folder);
      }
    }

    const existingUser = await User.findOne({
      $or: [{ phone: normalizedPhone }, { email: normalizedEmail }]
    });

    if (existingUser) {
      return errorResponse(res, 400, 'An account with this phone or email already exists. Please login.');
    }

    const user = await User.create({
      name: ownerName,
      phone: normalizedPhone,
      email: normalizedEmail,
      password,
      role: 'restaurant_owner',
      isPhoneVerified: true,
      isApproved: false,
      approvalStatus: 'pending',
      approvalNote: ''
    });

    const restaurant = await Restaurant.create({
      ownerId: user._id,
      name: restaurantName,
      email: normalizedEmail,
      phone: normalizedPhone,
      cuisines: cuisine ? [String(cuisine).trim()] : [],
      address: {
        street: address,
        city,
        state: city,
        zipCode: ''
      },
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      deliveryZone: {
        type: 'Polygon',
        coordinates: [[[longitude, latitude], [longitude + 0.01, latitude], [longitude + 0.01, latitude + 0.01], [longitude, latitude + 0.01], [longitude, latitude]]] // Default polygon around selected point
      },
      isApproved: false,
      fssaiLicense: fssaiLicense || '',
      panNumber: normalizedPan,
      gstNumber: normalizedGst,
      onboardingDocuments,
      onboardingMeta: {
        menuDetailsText: String(menuDetailsText || '').trim(),
        hasGst: Boolean(normalizedGst),
        onboardingStatus: 'under_review',
        loginReferenceId,
        partnerContract: {
          accepted: true,
          signerName: String(contractSignerName || '').trim(),
          acceptedAt: new Date(),
          contractVersion: 'v1'
        },
        loginPortal: '/accounts/restaurant/login'
      },
      bankDetails: {
        accountNumber: bankAccountNumber || '',
        ifscCode: normalizedIfsc,
        accountHolderName: bankAccountName || ownerName,
        bankName: bankName || ''
      }
    });

    successResponse(res, 201, 'Restaurant account created. Your application is pending admin approval.', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
        approvalNote: user.approvalNote
      },
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        isApproved: restaurant.isApproved,
        loginReferenceId,
        loginPortal: '/accounts/restaurant/login'
      }
    });

    sendContactEmail({
      name: ownerName,
      email: normalizedEmail,
      phone: normalizedPhone,
      subject: 'New Restaurant Partner Registration',
      message: `Restaurant Name: ${restaurantName}\nCity: ${city}\nAddress: ${address}\nFSSAI: ${fssaiLicense || 'Not provided'}\nPAN: ${normalizedPan || 'Not provided'}\nGST: ${normalizedGst || 'Not applicable'}\nBank Account: ${bankAccountNumber || 'Not provided'}\nIFSC: ${normalizedIfsc || 'Not provided'}\nMenu Details: ${String(menuDetailsText || '').slice(0, 200)}\nLocation: ${latitude}, ${longitude}\nPartner Contract Accepted: Yes\nSigner Name: ${String(contractSignerName || '').trim()}\nLogin Portal: /accounts/restaurant/login\nLogin Reference ID: ${loginReferenceId}\nOwner Login Email: ${normalizedEmail}\nOwner Login Phone: ${normalizedPhone}\nUser ID: ${user._id}\nRestaurant ID: ${restaurant._id}`
    }).catch((err) => {
      console.error('Failed to send restaurant registration email:', err.message);
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Phone or email is already in use.');
    }
    return errorResponse(res, 500, 'Failed to register restaurant account', error.message);
  }
};

// @desc    Register delivery partner account
// @route   POST /api/auth/register-delivery
// @access  Public
exports.registerDeliveryPartner = async (req, res) => {
  try {
    const { name, phone, email, password, city, vehicleType } = req.body;
    const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ phone: normalizedPhone }, { email: normalizedEmail }]
    });

    if (existingUser) {
      return errorResponse(res, 400, 'An account with this phone or email already exists. Please login.');
    }

    const user = await User.create({
      name,
      phone: normalizedPhone,
      email: normalizedEmail,
      password,
      role: 'delivery_partner',
      isPhoneVerified: true,
      isApproved: false,
      approvalStatus: 'pending',
      approvalNote: ''
    });

    successResponse(res, 201, 'Delivery partner account created. It is pending admin approval.', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
        approvalNote: user.approvalNote
      }
    });

    sendContactEmail({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      subject: 'New Delivery Partner Registration',
      message: `City: ${city || 'Not provided'}\nVehicle Type: ${vehicleType || 'Not provided'}\nUser ID: ${user._id}\nNote: Partner account requires admin approval before login.`
    }).catch((err) => {
      console.error('Failed to send delivery registration email:', err.message);
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'Phone or email is already in use.');
    }
    return errorResponse(res, 500, 'Failed to register delivery partner account', error.message);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { refreshToken: null, fcmToken: null }),
      PushSubscription.updateMany({ user: req.user._id }, { $set: { isActive: false } })
    ]);
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
      refreshToken: hashRefreshToken(refreshToken)
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

// @desc    Check phone account status for auth flows
// @route   GET /api/auth/phone-status
// @access  Public
exports.getPhoneAuthStatus = async (req, res) => {
  try {
    const rawPhone = String(req.query?.phone || req.body?.phone || '');
    const purpose = String(req.query?.purpose || req.body?.purpose || 'register').toLowerCase();
    const normalizedPhone = rawPhone.replace(/\D/g, '').slice(-10);

    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      return errorResponse(res, 400, 'Phone must be a valid 10-digit number');
    }

    const user = await User.findOne({ phone: normalizedPhone }).select('+password isPhoneVerified isActive');
    const hasAccount = Boolean(user && user.isPhoneVerified && user.password && user.isActive !== false);
    const canSendOtp = purpose === 'register' ? !hasAccount : hasAccount;

    const message = purpose === 'register'
      ? (hasAccount ? 'Phone number already registered. Please login.' : 'Phone number available for registration.')
      : (hasAccount ? 'Account found. You can continue with OTP verification.' : 'No account found with this phone number.');

    return successResponse(res, 200, message, {
      phone: normalizedPhone,
      purpose,
      hasAccount,
      canSendOtp
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to check phone status', error.message);
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

    await storeRefreshTokenHash(user, refreshToken);

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

    await storeRefreshTokenHash(user, refreshToken);

    user.password = undefined;
    user.refreshToken = undefined;

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendURL}/auth/google/success?token=${accessToken}&refresh=${refreshToken}`);
  } catch (error) {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendURL}/login?error=${encodeURIComponent('Authentication failed.')}`);
  }
};