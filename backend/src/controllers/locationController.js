const { successResponse, errorResponse } = require('../utils/responseHandler');
const { autocompleteAddress, geocodeAddress, reverseGeocode, normalizeCoordinates } = require('../services/locationService');

exports.autocomplete = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 3) {
      return successResponse(res, 200, 'Address suggestions retrieved', { suggestions: [] });
    }

    const suggestions = await autocompleteAddress(query);
    return successResponse(res, 200, 'Address suggestions retrieved', { suggestions });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch address suggestions', error.message);
  }
};

exports.geocode = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 3) {
      return errorResponse(res, 400, 'Address query is required');
    }

    const result = await geocodeAddress(query);
    if (!result) {
      return errorResponse(res, 404, 'Could not resolve coordinates for this address');
    }

    return successResponse(res, 200, 'Address geocoded successfully', { location: result });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to geocode address', error.message);
  }
};

exports.reverse = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const normalized = normalizeCoordinates(lng, lat);

    if (!normalized) {
      return errorResponse(res, 400, 'Valid latitude and longitude are required');
    }

    const result = await reverseGeocode(normalized[1], normalized[0]);
    if (!result) {
      return successResponse(res, 200, 'Coordinates resolved', {
        location: {
          lat: normalized[1],
          lng: normalized[0],
          coordinates: normalized,
          fullAddress: ''
        }
      });
    }

    return successResponse(res, 200, 'Coordinates resolved', { location: result });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reverse geocode coordinates', error.message);
  }
};
