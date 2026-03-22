const PlatformSettings = require('../models/PlatformSettings');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get public platform settings
// @route   GET /api/settings
// @access  Public
exports.getPlatformSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne().lean();
    if (!settings) {
      settings = await PlatformSettings.create({});
      settings = settings.toObject();
    }

    successResponse(res, 200, 'Platform settings retrieved', { settings });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get platform settings', error.message);
  }
};
