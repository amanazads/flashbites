const User = require('../models/User');
const Address = require('../models/Address');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { geocodeAddress, buildFullAddress } = require('../services/locationService');

const normalizeText = (value = '') => String(value).trim();

const normalizeCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;

  return [lng, lat];
};

const resolveCoordinatesFromInput = (input = {}, fallback = {}) => {
  let coordinates = normalizeCoordinates(input.coordinates ?? fallback.coordinates);
  if (coordinates) return coordinates;

  const lng = Number(input.lng ?? input.longitude ?? fallback.lng ?? fallback.longitude);
  const lat = Number(input.lat ?? input.latitude ?? fallback.lat ?? fallback.latitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    coordinates = normalizeCoordinates([lng, lat]);
    if (coordinates) return coordinates;
  }

  return null;
};

const validateAndBuildAddressPayload = async (input, fallback = {}) => {
  const street = normalizeText(input.street ?? fallback.street);
  const zipCode = normalizeText(input.zipCode ?? fallback.zipCode);
  const city = normalizeText(input.city ?? fallback.city);
  const state = normalizeText(input.state ?? fallback.state);
  const landmark = normalizeText(input.landmark ?? fallback.landmark);

  const fullAddress = normalizeText(input.fullAddress ?? fallback.fullAddress)
    || buildFullAddress({ street, landmark, city, state, zipCode });

  if (!fullAddress && !street && !city) {
    return { error: 'Please provide a delivery address' };
  }

  let coordinates = resolveCoordinatesFromInput(input, fallback);
  if (!coordinates) {
    const query = fullAddress || [street, landmark, city, state, zipCode].filter(Boolean).join(', ');
    const geocoded = await geocodeAddress(query);
    coordinates = geocoded?.coordinates || null;
  }

  coordinates = normalizeCoordinates(coordinates);
  if (!coordinates) {
    return { error: 'Unable to detect address coordinates. Please select an address suggestion or map point.' };
  }

  return {
    payload: {
      type: normalizeText(input.type ?? fallback.type ?? 'home'),
      street,
      city,
      state,
      zipCode,
      fullAddress: fullAddress || buildFullAddress({ street, landmark, city, state, zipCode }),
      landmark,
      coordinates,
      lng: coordinates[0],
      lat: coordinates[1],
      isDefault: Boolean(input.isDefault ?? fallback.isDefault)
    }
  };
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone, avatar } },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    successResponse(res, 200, 'Profile updated successfully', { user });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update profile', error.message);
  }
};

// @desc    Add address
// @route   POST /api/users/addresses
// @access  Private
exports.addAddress = async (req, res) => {
  try {
    const { payload, error } = await validateAndBuildAddressPayload(req.body);
    if (error) {
      return errorResponse(res, 400, error);
    }

    if (!payload.street) {
      return errorResponse(res, 400, 'Street address is required');
    }

    const duplicateAddress = await Address.findOne({
      userId: req.user._id,
      fullAddress: payload.fullAddress,
      street: payload.street,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode,
      coordinates: payload.coordinates,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });

    if (duplicateAddress) {
      return successResponse(res, 200, 'Address already exists', { address: duplicateAddress });
    }

    // If this is set as default, unset other default addresses
    if (payload.isDefault) {
      await Address.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
    }

    const address = await Address.create({
      userId: req.user._id,
      ...payload
    });

    successResponse(res, 201, 'Address added successfully', { address });
  } catch (error) {
    console.error('Add address error:', error);
    errorResponse(res, 500, 'Failed to add address', error.message);
  }
};

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id });

    successResponse(res, 200, 'Addresses retrieved successfully', {
      count: addresses.length,
      addresses
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get addresses', error.message);
  }
};

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
exports.updateAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!address) {
      return errorResponse(res, 404, 'Address not found');
    }

    const { payload, error } = await validateAndBuildAddressPayload(req.body, address.toObject());
    if (error) {
      return errorResponse(res, 400, error);
    }

    if (!payload.street) {
      return errorResponse(res, 400, 'Street address is required');
    }

    if (payload.isDefault) {
      await Address.updateMany(
        { userId: req.user._id, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    successResponse(res, 200, 'Address updated successfully', { address: updatedAddress });
  } catch (error) {
    console.error('Update address error:', error);
    errorResponse(res, 500, 'Failed to update address', error.message);
  }
};

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!address) {
      return errorResponse(res, 404, 'Address not found');
    }

    successResponse(res, 200, 'Address deleted successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete address', error.message);
  }
};

// @desc    Set default address
// @route   PATCH /api/users/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res) => {
  try {
    const existingAddress = await Address.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingAddress) {
      return errorResponse(res, 404, 'Address not found');
    }

    if (existingAddress.isDefault) {
      return successResponse(res, 200, 'Default address updated', { address: existingAddress });
    }

    // Unset all default addresses
    await Address.updateMany(
      { userId: req.user._id },
      { isDefault: false }
    );

    // Set new default
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDefault: true },
      { new: true }
    );

    successResponse(res, 200, 'Default address updated', { address });
  } catch (error) {
    errorResponse(res, 500, 'Failed to set default address', error.message);
  }
};

// @desc    Save FCM token for push notifications
// @route   POST /api/users/fcm-token
// @access  Private
exports.saveFcmToken = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
      return errorResponse(res, 400, 'FCM token is required');
    }

    // Keep a token bound to only one user to prevent cross-account notifications
    // on shared/reused devices.
    await User.updateMany(
      {
        _id: { $ne: req.user._id },
        fcmToken: token
      },
      {
        $set: { fcmToken: null }
      }
    );

    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fcmToken: token } },
      { new: true }
    );

    successResponse(res, 200, 'FCM token saved successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to save FCM token', error.message);
  }
};

// @desc    Submit account deletion request
// @route   POST /api/users/account-deletion-requests
// @access  Private
exports.submitAccountDeletionRequest = async (req, res) => {
  try {
    const { reason, details = '' } = req.body;

    if (!reason || reason.trim().length < 10) {
      return errorResponse(res, 400, 'Please provide a reason with at least 10 characters');
    }

    const pendingRequest = await AccountDeletionRequest.findOne({
      userId: req.user._id,
      status: 'pending'
    });

    if (pendingRequest) {
      return errorResponse(res, 409, 'You already have a pending account deletion request under review');
    }

    const deletionRequest = await AccountDeletionRequest.create({
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email || null,
      phone: req.user.phone,
      reason: reason.trim(),
      details: details.trim(),
      status: 'pending',
      expectedDeletionWindow: '2-4 weeks'
    });

    successResponse(res, 201, 'Deletion request submitted. Our team will review it and complete account deletion within 2-4 weeks.', {
      request: deletionRequest
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to submit deletion request', error.message);
  }
};

// @desc    Get my latest account deletion request
// @route   GET /api/users/account-deletion-requests/me
// @access  Private
exports.getMyDeletionRequest = async (req, res) => {
  try {
    const request = await AccountDeletionRequest.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Deletion request status fetched successfully', { request });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch deletion request status', error.message);
  }
};

// @desc    Delete authenticated user account (disabled for users)
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    return errorResponse(
      res,
      403,
      'Direct account deletion is disabled. Please submit an account deletion request for admin review (2-4 weeks).'
    );

  } catch (error) {
    errorResponse(res, 500, 'Failed to delete account', error.message);
  }
};