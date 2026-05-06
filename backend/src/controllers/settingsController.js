const PlatformSettings = require('../models/PlatformSettings');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { normalizeFeeControls } = require('../utils/feeControl');
const { normalizeMenuCategories } = require('../utils/menuCategories');

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

    settings = {
      ...settings,
      feeControls: normalizeFeeControls(settings.feeControls),
      menuCategories: normalizeMenuCategories(settings.menuCategories),
    };

    successResponse(res, 200, 'Platform settings retrieved', { settings });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get platform settings', error.message);
  }
};
