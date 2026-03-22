const User = require('../models/User');
const Address = require('../models/Address');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const axios = require('axios');

const INDIA_PIN_REGEX = /^[1-9][0-9]{5}$/;

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

const validatePincode = async (zipCode) => {
  try {
    const response = await axios.get(`https://api.postalpincode.in/pincode/${zipCode}`, { timeout: 5000 });
    const data = response?.data?.[0];

    if (!data || data.Status !== 'Success' || !Array.isArray(data.PostOffice) || data.PostOffice.length === 0) {
      return null;
    }

    const postOffice = data.PostOffice[0];
    return {
      district: normalizeText(postOffice.District),
      state: normalizeText(postOffice.State)
    };
  } catch {
    return { unavailable: true };
  }
};

const geocodeAddress = async ({ zipCode, city, state }) => {
  const queries = [
    `${zipCode}, ${city}, ${state}, India`,
    `${zipCode}, ${state}, India`,
    `${zipCode}, India`
  ];

  for (const query of queries) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        timeout: 7000,
        headers: {
          'User-Agent': 'FlashBites/1.0 (support@flashbites.in)'
        },
        params: {
          q: query,
          format: 'json',
          limit: 1
        }
      });

      const first = response?.data?.[0];
      if (first && first.lat && first.lon) {
        const lat = Number(first.lat);
        const lng = Number(first.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lng, lat];
        }
      }
    } catch {
      // Try the next query variant.
    }
  }

  return null;
};

const validateAndBuildAddressPayload = async (input, fallback = {}) => {
  const zipCode = normalizeText(input.zipCode ?? fallback.zipCode);
  const city = normalizeText(input.city ?? fallback.city);
  const state = normalizeText(input.state ?? fallback.state);

  if (!zipCode || !city || !state) {
    return { error: 'City, state and PIN code are required' };
  }

  if (!INDIA_PIN_REGEX.test(zipCode)) {
    return { error: 'Please enter a valid 6-digit Indian PIN code' };
  }

  const pinMeta = await validatePincode(zipCode);
  if (!pinMeta) {
    return { error: 'Invalid PIN code. Please enter a valid serviceable location.' };
  }

  if (!pinMeta.unavailable) {
    const cityLc = city.toLowerCase();
    const districtLc = pinMeta.district.toLowerCase();
    const stateLc = state.toLowerCase();
    const validStateLc = pinMeta.state.toLowerCase();

    const cityMatches = cityLc.includes(districtLc) || districtLc.includes(cityLc);
    const stateMatches = stateLc === validStateLc;

    if (!cityMatches || !stateMatches) {
      return {
        error: `PIN code ${zipCode} belongs to ${pinMeta.district}, ${pinMeta.state}. Please correct city/state.`
      };
    }
  }

  let coordinates = normalizeCoordinates(input.coordinates ?? fallback.coordinates);
  if (!coordinates) {
    coordinates = await geocodeAddress({ zipCode, city, state });
  }

  coordinates = normalizeCoordinates(coordinates);
  if (!coordinates) {
    return { error: 'Unable to verify address location. Please enter a valid address.' };
  }

  return {
    payload: {
      type: normalizeText(input.type ?? fallback.type ?? 'home'),
      street: normalizeText(input.street ?? fallback.street),
      city,
      state,
      zipCode,
      landmark: normalizeText(input.landmark ?? fallback.landmark),
      coordinates,
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

    if (!address) {
      return errorResponse(res, 404, 'Address not found');
    }

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
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, 400, 'FCM token is required');
    }

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