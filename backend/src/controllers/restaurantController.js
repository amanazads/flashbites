const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { calculateDistance } = require('../utils/calculateDistance');
const { isPointInDeliveryZone, normalizeDeliveryZone } = require('../utils/deliveryGeo');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/imageUpload');
const { geocodeAddress } = require('../services/locationService');

const debugAddressFlow = process.env.DEBUG_ADDRESS_FLOW === 'true';
const GEO_FALLBACK_LOG_INTERVAL_MS = 5 * 60 * 1000;
const GEO_PRIMARY_SUCCESS_SAMPLE_RATE = 0.01;
let lastNearbyGeoFallbackLogAt = 0;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ADMIN_AREA_SUFFIX_REGEX = /\b(tehsil|tahsil|district|division|mandal|taluk|taluka|subdivision|sub-division)\b/gi;

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const normalizeCityFragment = (value = '') => (
  String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(ADMIN_AREA_SUFFIX_REGEX, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const buildCityMatchers = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const fragments = raw
    .split(',')
    .map((part) => normalizeCityFragment(part))
    .filter(Boolean);

  const normalizedWhole = normalizeCityFragment(raw);
  const tokens = normalizedWhole.split(' ').filter(Boolean);

  const candidates = [
    raw,
    normalizedWhole,
    fragments[0],
    fragments[1],
    tokens.slice(0, 2).join(' '),
    tokens[0]
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [...new Set(candidates)].map((item) => new RegExp(escapeRegex(item), 'i'));
};

const buildCityQuery = (city = '') => {
  const regexes = buildCityMatchers(city);
  if (regexes.length === 0) return null;
  if (regexes.length === 1) return { 'address.city': { $regex: regexes[0] } };

  return {
    $or: regexes.map((regex) => ({
      'address.city': { $regex: regex }
    }))
  };
};

const buildAreaFallbackQuery = ({ city = '', zipCode = '', state = '' } = {}) => {
  const orConditions = [];
  const cityQuery = buildCityQuery(city);

  if (cityQuery?.$or) {
    orConditions.push(...cityQuery.$or);
  } else if (cityQuery) {
    orConditions.push(cityQuery);
  }

  const zip = String(zipCode || '').trim();
  if (zip) {
    orConditions.push({ 'address.zipCode': zip });
  }

  const normalizedState = normalizeCityFragment(state);
  if (normalizedState) {
    orConditions.push({ 'address.state': { $regex: new RegExp(escapeRegex(normalizedState), 'i') } });
  }

  if (orConditions.length === 0) return null;
  if (orConditions.length === 1) return orConditions[0];
  return { $or: orConditions };
};

const fetchGeneralRestaurantFallback = async (limit) => (
  Restaurant.find(buildPublicRestaurantQuery())
    .select('-documents -bankDetails -__v')
    .sort({ rating: -1, createdAt: -1 })
    .limit(limit)
    .lean()
);

const normalizeCoordPair = (first, second) => {
  const lng = Number(first);
  const lat = Number(second);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;
  return [lng, lat];
};

const resolveLocationFromBody = (payload = {}) => {
  const location = payload.location;

  if (location?.coordinates?.length >= 2) {
    const normalized = normalizeCoordPair(location.coordinates[0], location.coordinates[1]);
    if (normalized) return { type: 'Point', coordinates: normalized };
  }

  if (location?.lat != null && location?.lng != null) {
    const normalized = normalizeCoordPair(location.lng, location.lat);
    if (normalized) return { type: 'Point', coordinates: normalized };
  }

  if (payload.lat != null && payload.lng != null) {
    const normalized = normalizeCoordPair(payload.lng, payload.lat);
    if (normalized) return { type: 'Point', coordinates: normalized };
  }

  if (payload.latitude != null && payload.longitude != null) {
    const normalized = normalizeCoordPair(payload.longitude, payload.latitude);
    if (normalized) return { type: 'Point', coordinates: normalized };
  }

  return null;
};

const geocodeRestaurantAddress = async ({ name, address = {} }) => {
  const queries = [
    [address.street, address.city, address.state, address.zipCode, name, 'India'].filter(Boolean).join(', '),
    [address.street, address.city, address.state, 'India'].filter(Boolean).join(', '),
    [address.city, address.state, address.zipCode, 'India'].filter(Boolean).join(', '),
    [address.city, address.state, 'India'].filter(Boolean).join(', '),
    [name, address.city, address.state, 'India'].filter(Boolean).join(', ')
  ].filter(Boolean);

  if (queries.length === 0) return null;

  for (const query of queries) {
    try {
      const geocoded = await geocodeAddress(query);
      const normalized = normalizeCoordPair(geocoded?.lng, geocoded?.lat);
      if (normalized) {
        return { type: 'Point', coordinates: normalized };
      }
    } catch {
      // try next query
    }
  }

  return null;
};

const parseDeliveryZonePayload = (value) => {
  if (!value) return null;

  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (Array.isArray(raw)) {
    return normalizeDeliveryZone({ type: 'Polygon', coordinates: [raw] });
  }

  return normalizeDeliveryZone(raw);
};

const isUsableRestaurantDeliveryZone = (deliveryZone, restaurantCoords) => {
  if (!deliveryZone?.coordinates?.[0]?.length) return false;
  if (!Array.isArray(restaurantCoords) || restaurantCoords.length < 2) return false;

  const restLng = Number(restaurantCoords[0]);
  const restLat = Number(restaurantCoords[1]);
  if (!Number.isFinite(restLng) || !Number.isFinite(restLat)) return false;

  // If a saved zone does not even include the restaurant itself, treat it as stale/mismatched.
  return isPointInDeliveryZone(deliveryZone, [restLng, restLat]);
};

const logNearbyGeoFallback = ({ lat, lng, maxDistance, limit, error }) => {
  if (process.env.NODE_ENV !== 'production') return;

  const now = Date.now();
  if (now - lastNearbyGeoFallbackLogAt < GEO_FALLBACK_LOG_INTERVAL_MS) {
    return;
  }

  lastNearbyGeoFallbackLogAt = now;

  const payload = {
    event: 'restaurants_nearby_geo_fallback',
    ts: new Date(now).toISOString(),
    lat: Number.isFinite(lat) ? Number(lat.toFixed(3)) : null,
    lng: Number.isFinite(lng) ? Number(lng.toFixed(3)) : null,
    maxDistance,
    limit,
    errorName: error?.name || 'UnknownError',
    errorCode: error?.code || null,
    errorMessage: error?.message || 'unknown'
  };

  console.warn(JSON.stringify(payload));
};

const logNearbyGeoPrimarySuccess = ({ lat, lng, maxDistance, limit, candidateCount }) => {
  if (process.env.NODE_ENV !== 'production') return;
  if (Math.random() >= GEO_PRIMARY_SUCCESS_SAMPLE_RATE) return;

  const now = Date.now();
  const payload = {
    event: 'restaurants_nearby_geo_primary_ok',
    ts: new Date(now).toISOString(),
    sampleRate: GEO_PRIMARY_SUCCESS_SAMPLE_RATE,
    lat: Number.isFinite(lat) ? Number(lat.toFixed(3)) : null,
    lng: Number.isFinite(lng) ? Number(lng.toFixed(3)) : null,
    maxDistance,
    limit,
    candidateCount: Number.isFinite(candidateCount) ? candidateCount : 0
  };

  console.info(JSON.stringify(payload));
};

const setRestaurantCacheHeaders = (res, maxAgeSeconds = 30, staleSeconds = 60) => {
  if (process.env.NODE_ENV !== 'production') {
    res.set('Cache-Control', 'no-store');
    return;
  }

  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`);
};

const buildPublicRestaurantQuery = (extra = {}) => {
  const query = {
    isActive: true,
    ...extra
  };

  if (process.env.NODE_ENV === 'production') {
    query.isApproved = true;
  }

  return query;
};

// @desc    Create restaurant
// @route   POST /api/restaurants
// @access  Private (Restaurant Owner)
exports.createRestaurant = async (req, res) => {
  try {
    let { name, email, phone, description, cuisines, address, location, timing, deliveryFee, deliveryTime, prepTimeMinutes, deliveryRadiusKm, deliveryRadius, deliveryZone } = req.body;

    // Parse JSON strings from FormData
    if (typeof cuisines === 'string') cuisines = JSON.parse(cuisines);
    if (typeof address === 'string') address = JSON.parse(address);
    if (typeof location === 'string') location = JSON.parse(location);
    if (typeof timing === 'string') timing = JSON.parse(timing);
    if (typeof prepTimeMinutes === 'string') prepTimeMinutes = Number(prepTimeMinutes);

    if (deliveryRadiusKm == null && deliveryRadius != null) {
      deliveryRadiusKm = deliveryRadius;
    }

    const normalizedDeliveryZone = parseDeliveryZonePayload(deliveryZone);

    // Keep parsed location object authoritative over raw multipart string values.
    let resolvedLocation = resolveLocationFromBody({ ...req.body, location });
    if (!resolvedLocation) {
      resolvedLocation = await geocodeRestaurantAddress({ name, address });
    }

    if (!resolvedLocation) {
      console.warn('Restaurant location resolve failed', {
        name,
        address,
        rawLocation: location,
        bodyLat: req.body.lat,
        bodyLng: req.body.lng
      });
      return errorResponse(res, 400, 'Restaurant location is required. Please provide a valid address or coordinates.');
    }

    // Check if user already has a restaurant
    const existingRestaurant = await Restaurant.findOne({ ownerId: req.user._id });
    if (existingRestaurant) {
      return errorResponse(res, 400, 'You already have a registered restaurant');
    }

    // Handle image upload
    let imageUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, 'flashbites/restaurants');
    }

    const restaurant = await Restaurant.create({
      ownerId: req.user._id,
      name,
      email,
      phone,
      description,
      cuisines,
      address,
      location: resolvedLocation,
      timing,
      deliveryFee,
      deliveryTime,
      prepTimeMinutes,
      deliveryRadiusKm,
      deliveryZone: normalizedDeliveryZone || undefined,
      image: imageUrl
    });

    successResponse(res, 201, 'Restaurant created successfully. Pending admin approval', { restaurant });
  } catch (error) {
    errorResponse(res, 500, 'Failed to create restaurant', error.message);
  }
};

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getAllRestaurants = async (req, res) => {
  try {
    const {
      cuisine,
      search,
      lat,
      lng,
      addressLat,
      addressLng,
      radius = 20000,
      minRating,
      sortBy = '-rating',
      page = 1,
      limit = 30,
      city
    } = req.query;

    let query = buildPublicRestaurantQuery();

    // Filter by cuisine
    if (cuisine) {
      query.cuisines = { $in: [cuisine] };
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const cityQuery = buildCityQuery(city);
    if (cityQuery) {
      query = { ...query, ...cityQuery };
    }

    // Filter by rating
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const allowedSort = new Set(['-rating', 'rating', '-createdAt', 'createdAt', 'name', '-name']);
    const effectiveSort = allowedSort.has(sortBy) ? sortBy : '-rating';

    const projection = '-documents -bankDetails -__v';

    let restaurants;

    // Geospatial search
    if (lat || lng || addressLat || addressLng) {
      const latNum = Number(lat ?? addressLat);
      const lngNum = Number(lng ?? addressLng);
      const maxDistance = parseInt(radius, 10);

      if (debugAddressFlow) {
        console.log('[address-flow][restaurants] incoming filters', {
          lat: latNum,
          lng: lngNum,
          maxDistance,
          city,
          cuisine,
          search,
        });
      }

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        // Fallback gracefully when client sends stale/invalid coords.
        restaurants = await Restaurant.find(query)
          .sort(effectiveSort)
          .skip(skip)
          .limit(safeLimit)
          .select(projection)
          .lean();

        setRestaurantCacheHeaders(res, 30, 60);
        return successResponse(res, 200, 'Restaurants retrieved successfully', {
          page: safePage,
          limit: safeLimit,
          count: restaurants.length,
          restaurants
        });
      }

      const geoQuery = {
        ...query,
        'location.type': 'Point',
        'location.coordinates.0': { $type: 'number' },
        'location.coordinates.1': { $type: 'number' }
      };

      let candidates = [];

      try {
        candidates = await Restaurant.aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [lngNum, latNum]
              },
              distanceField: 'distanceMeters',
              maxDistance,
              spherical: true,
              query: geoQuery
            }
          },
          {
            $project: {
              documents: 0,
              bankDetails: 0,
              __v: 0
            }
          },
          {
            $limit: 500
          }
        ]);
      } catch (error) {
        // Fallback when aggregation/geoNear fails; filter in memory.
        candidates = await Restaurant.find(geoQuery)
          .select(projection)
          .limit(1000)
          .lean();
      }

      restaurants = candidates
        .map((r) => {
          const coords = r.location?.coordinates || [];
          if (coords.length !== 2) return null;

          const point = [lngNum, latNum];
          const hasUsableZone = isUsableRestaurantDeliveryZone(r.deliveryZone, coords);
          if (hasUsableZone && !isPointInDeliveryZone(r.deliveryZone, point)) return null;

          const distanceKm = calculateDistance(latNum, lngNum, coords[1], coords[0]);
          const allowedKm = Number(r.deliveryRadiusKm || 20);
          if (!Number.isFinite(distanceKm)) return null;
          if (!hasUsableZone && distanceKm > allowedKm) return null;
          return { ...r, distanceKm: Number(distanceKm.toFixed(2)) };
        })
        .filter(Boolean)
        .slice(0, safeLimit);

      if (debugAddressFlow) {
        console.log('[address-flow][restaurants] filter result', {
          candidateCount: candidates.length,
          returnedCount: restaurants.length,
        });
      }
    } else {
      restaurants = await Restaurant.find(query)
        .sort(effectiveSort)
        .skip(skip)
        .limit(safeLimit)
        .select(projection)
        .lean();
    }

    // Cache public restaurant list in production only.
    setRestaurantCacheHeaders(res, 30, 60);
    successResponse(res, 200, 'Restaurants retrieved successfully', {
      page: safePage,
      limit: safeLimit,
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get restaurants', error.message);
  }
};

// @desc    Get nearby restaurants by coordinates
// @route   GET /api/restaurants/nearby
// @access  Public
exports.getNearbyRestaurants = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const city = String(req.query.city || '').trim();
    const zipCode = String(req.query.zipCode || '').trim();
    const state = String(req.query.state || '').trim();
    const maxDistanceRaw = Number(req.query.maxDistance || 10000);
    const maxDistance = Number.isFinite(maxDistanceRaw)
      ? Math.min(Math.max(maxDistanceRaw, 1000), 100000)
      : 10000;
    const safeLimit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return errorResponse(res, 400, 'Valid latitude and longitude are required');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse(res, 400, 'Latitude/longitude out of valid range');
    }

    let candidates = [];

    try {
      candidates = await Restaurant.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            distanceField: 'distanceMeters',
            maxDistance,
            spherical: true,
            query: {
              ...buildPublicRestaurantQuery(),
              'location.type': 'Point',
              'location.coordinates.0': { $type: 'number' },
              'location.coordinates.1': { $type: 'number' }
            }
          }
        },
        {
          $addFields: {
            distanceKm: { $divide: ['$distanceMeters', 1000] }
          }
        },
        {
          $project: {
            documents: 0,
            bankDetails: 0,
            __v: 0,
            distanceMeters: 0
          }
        },
        {
          $sort: { distanceKm: 1, rating: -1 }
        },
        {
          $limit: Math.min(safeLimit * 5, 500)
        }
      ]);

      logNearbyGeoPrimarySuccess({
        lat,
        lng,
        maxDistance,
        limit: safeLimit,
        candidateCount: candidates.length
      });
    } catch (geoError) {
      // Fallback for environments where geo indexes are stale or temporarily unavailable.
      logNearbyGeoFallback({
        lat,
        lng,
        maxDistance,
        limit: safeLimit,
        error: geoError
      });

      const fallbackRestaurants = await Restaurant.find({
        ...buildPublicRestaurantQuery(),
        'location.type': 'Point',
        'location.coordinates.0': { $type: 'number' },
        'location.coordinates.1': { $type: 'number' }
      })
        .select('-documents -bankDetails -__v')
        .limit(1000)
        .lean();

      candidates = fallbackRestaurants
        .map((restaurant) => {
          const coords = restaurant.location?.coordinates || [];
          if (coords.length !== 2) return null;

          const distanceKm = calculateDistance(lat, lng, Number(coords[1]), Number(coords[0]));
          if (!Number.isFinite(distanceKm)) return null;
          if (distanceKm * 1000 > maxDistance) return null;

          return {
            ...restaurant,
            distanceKm: Number(distanceKm.toFixed(2))
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
          return Number(b.rating || 0) - Number(a.rating || 0);
        })
        .slice(0, Math.min(safeLimit * 5, 500));

      if (process.env.NODE_ENV !== 'production') {
        console.warn('getNearbyRestaurants fallback activated:', geoError.message);
      }
    }

    let restaurants = candidates.filter((restaurant) => {
      const coords = restaurant.location?.coordinates || [];
      const hasUsableZone = isUsableRestaurantDeliveryZone(restaurant.deliveryZone, coords);

      if (hasUsableZone) {
        return isPointInDeliveryZone(restaurant.deliveryZone, [lng, lat]);
      }

      const distanceKm = Number(restaurant.distanceKm);
      const allowedKm = Number(restaurant.deliveryRadiusKm || 20);
      return Number.isFinite(distanceKm) && distanceKm <= allowedKm;
    }).slice(0, safeLimit);

    if (restaurants.length === 0 && city) {
      const areaFallbackQuery = buildAreaFallbackQuery({ city, zipCode, state });
      restaurants = await Restaurant.find(buildPublicRestaurantQuery(areaFallbackQuery || {}))
        .select('-documents -bankDetails -__v')
        .sort({ rating: -1, createdAt: -1 })
        .limit(safeLimit)
        .lean();
    }

    return successResponse(res, 200, 'Nearby restaurants retrieved successfully', {
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get nearby restaurants', error.message);
  }
};

// @desc    Search restaurants and menu items
// @route   GET /api/restaurants/search
// @access  Public
exports.searchRestaurantsAndItems = async (req, res) => {
  try {
    const { q = '', city, limit = 8 } = req.query;
    const term = String(q || '').trim();

    if (term.length === 0) {
      return successResponse(res, 200, 'Search results retrieved successfully', {
        query: '',
        restaurants: [],
        items: []
      });
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 20);
    const regex = new RegExp(escapeRegex(term), 'i');

    const restaurantQuery = {
      ...buildPublicRestaurantQuery(),
      $or: [
        { name: { $regex: regex } },
        { cuisines: { $in: [regex] } }
      ]
    };

    const cityQuery = buildCityQuery(city);
    if (cityQuery) {
      Object.assign(restaurantQuery, cityQuery);
    }

    const restaurants = await Restaurant.find(restaurantQuery)
      .select('name cuisines image rating deliveryTime address')
      .sort({ rating: -1, createdAt: -1 })
      .limit(safeLimit)
      .lean();

    const itemPipeline = [
      {
        $match: {
          isAvailable: true,
          $or: [
            { name: { $regex: regex } },
            { description: { $regex: regex } },
            { category: { $regex: regex } },
            { categories: { $elemMatch: { $regex: regex } } }
          ]
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $match: {
          'restaurant.isActive': true,
          ...(process.env.NODE_ENV === 'production' ? { 'restaurant.isApproved': true } : {}),
          ...(cityQuery
            ? {
                $or: buildCityMatchers(city).map((regex) => ({
                  'restaurant.address.city': { $regex: regex }
                }))
              }
            : {})
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          image: 1,
          category: 1,
          categories: 1,
          restaurantId: '$restaurant._id',
          restaurantName: '$restaurant.name'
        }
      },
      { $limit: safeLimit * 4 }
    ];

    const items = await MenuItem.aggregate(itemPipeline);

    successResponse(res, 200, 'Search results retrieved successfully', {
      query: term,
      restaurants,
      items
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to search restaurants and menu items', error.message);
  }
};

// @desc    Get restaurant by ID
// @route   GET /api/restaurants/:id
// @access  Public
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .select('-documents -bankDetails -__v')
      .lean();

    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    if (!restaurant.isActive || (process.env.NODE_ENV === 'production' && !restaurant.isApproved)) {
      return errorResponse(res, 403, 'Restaurant is not available');
    }

    // Cache individual restaurant page in production only.
    setRestaurantCacheHeaders(res, 60, 120);
    successResponse(res, 200, 'Restaurant retrieved successfully', { restaurant });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get restaurant', error.message);
  }
};


// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private (Owner/Admin)
exports.updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    // Parse JSON strings from FormData
    if (typeof req.body.cuisines === 'string') req.body.cuisines = JSON.parse(req.body.cuisines);
    if (typeof req.body.address === 'string') req.body.address = JSON.parse(req.body.address);
    if (typeof req.body.location === 'string') req.body.location = JSON.parse(req.body.location);
    if (typeof req.body.timing === 'string') req.body.timing = JSON.parse(req.body.timing);
    if (typeof req.body.prepTimeMinutes === 'string') req.body.prepTimeMinutes = Number(req.body.prepTimeMinutes);

    // Handle image upload if new file provided
    if (req.file) {
      // Delete old image from Cloudinary if it exists and is not default
      if (restaurant.image && !restaurant.image.includes('unsplash')) {
        await deleteFromCloudinary(restaurant.image);
      }
      req.body.image = await uploadToCloudinary(req.file.buffer, 'flashbites/restaurants');
    }

    if (req.body.deliveryRadiusKm == null && req.body.deliveryRadius != null) {
      req.body.deliveryRadiusKm = req.body.deliveryRadius;
    }

    if (req.body.deliveryZone !== undefined) {
      const normalizedDeliveryZone = parseDeliveryZonePayload(req.body.deliveryZone);
      if (normalizedDeliveryZone) {
        req.body.deliveryZone = normalizedDeliveryZone;
      } else if (req.body.deliveryZone === null || req.body.deliveryZone === '') {
        req.body.deliveryZone = undefined;
      }
    }

    const normalizedLocation = resolveLocationFromBody(req.body);
    if (normalizedLocation) {
      req.body.location = normalizedLocation;
    }

    if (!req.body.location && req.body.address) {
      const resolvedLocation = await geocodeRestaurantAddress({
        name: req.body.name || restaurant.name,
        address: req.body.address
      });
      if (resolvedLocation) {
        req.body.location = resolvedLocation;
      }
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    successResponse(res, 200, 'Restaurant updated successfully', { restaurant: updatedRestaurant });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update restaurant', error.message);
  }
};

// @desc    Toggle restaurant status
// @route   PATCH /api/restaurants/:id/toggle-status
// @access  Private (Owner)
exports.toggleRestaurantStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    restaurant.acceptingOrders = !restaurant.acceptingOrders;
    await restaurant.save();

    successResponse(res, 200, 'Restaurant status updated', { restaurant });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update status', error.message);
  }
};

// @desc    Get my restaurant (for restaurant owner)
// @route   GET /api/restaurants/my-restaurant
// @access  Private (Restaurant Owner)
exports.getMyRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).lean();
    
    if (!restaurant) {
      return successResponse(res, 200, 'No restaurant found for this owner', {
        restaurant: null,
        needsSetup: true
      });
    }

    successResponse(res, 200, 'Restaurant retrieved successfully', { restaurant });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get restaurant', error.message);
  }
};

// @desc    Get restaurant dashboard data
// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private (Owner)
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    // Check ownership
    if (restaurant.ownerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to delete this restaurant');
    }

    // Delete all menu items for this restaurant
    await MenuItem.deleteMany({ restaurantId: req.params.id });

    // Delete the restaurant image from cloudinary if exists
    if (restaurant.image && restaurant.image.includes('cloudinary')) {
      const publicId = restaurant.image.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    // Delete the restaurant
    await Restaurant.findByIdAndDelete(req.params.id);

    successResponse(res, 200, 'Restaurant and all associated data deleted successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete restaurant', error.message);
  }
};

// @route   GET /api/restaurants/:id/dashboard
// @access  Private (Owner)
exports.getRestaurantDashboard = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const restaurantId = req.params.id;

    // Get total orders
    const totalOrders = await Order.countDocuments({ restaurantId });

    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get total earnings
    const earnings = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: {
              $cond: [
                { $gt: ['$restaurantEarning', 0] },
                '$restaurantEarning',
                {
                  $multiply: [
                    {
                      $max: [
                        {
                          $subtract: [
                            { $ifNull: ['$subtotal', 0] },
                            { $ifNull: ['$discount', 0] }
                          ]
                        },
                        0
                      ]
                    },
                    { $ifNull: ['$restaurantPayoutRateSnapshot', 0.75] }
                  ]
                }
              ]
            }
          },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.find({ restaurantId })
      .sort('-createdAt')
      .limit(10)
      .populate('userId', 'name phone');

    successResponse(res, 200, 'Dashboard data retrieved', {
      totalOrders,
      ordersByStatus,
      earnings: earnings[0] || { totalEarnings: 0, totalOrders: 0 },
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    errorResponse(res, 500, 'Failed to get dashboard data', error.message);
  }
};

// @desc    Get restaurant analytics with day-wise revenue
// @route   GET /api/restaurants/:id/analytics
// @access  Private (Restaurant Owner)
exports.getRestaurantAnalytics = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Payment = require('../models/Payment');
    const restaurantId = req.params.id;
    const { startDate, endDate, period = '30' } = req.query;

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));

    // Get total orders and delivered orders
    const orderStats = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                {
                  $cond: [
                    { $gt: ['$restaurantEarning', 0] },
                    '$restaurantEarning',
                    {
                      $multiply: [
                        {
                          $max: [
                            {
                              $subtract: [
                                { $ifNull: ['$subtotal', 0] },
                                { $ifNull: ['$discount', 0] }
                              ]
                            },
                            0
                          ]
                        },
                        { $ifNull: ['$restaurantPayoutRateSnapshot', 0.75] }
                      ]
                    }
                  ]
                },
                0
              ]
            }
          },
          totalOrderValue: { $sum: '$total' }
        }
      }
    ]);

    // Get day-wise revenue breakdown
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: 'delivered',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          date: { $first: '$createdAt' },
          revenue: {
            $sum: {
              $cond: [
                { $gt: ['$restaurantEarning', 0] },
                '$restaurantEarning',
                {
                  $multiply: [
                    {
                      $max: [
                        {
                          $subtract: [
                            { $ifNull: ['$subtotal', 0] },
                            { $ifNull: ['$discount', 0] }
                          ]
                        },
                        0
                      ]
                    },
                    { $ifNull: ['$restaurantPayoutRateSnapshot', 0.75] }
                  ]
                }
              ]
            }
          },
          orderCount: { $sum: 1 },
          avgOrderValue: {
            $avg: {
              $cond: [
                { $gt: ['$restaurantEarning', 0] },
                '$restaurantEarning',
                {
                  $multiply: [
                    {
                      $max: [
                        {
                          $subtract: [
                            { $ifNull: ['$subtotal', 0] },
                            { $ifNull: ['$discount', 0] }
                          ]
                        },
                        0
                      ]
                    },
                    { $ifNull: ['$restaurantPayoutRateSnapshot', 0.75] }
                  ]
                }
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get payment method breakdown
    const paymentBreakdown = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: 'delivered',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $gt: ['$restaurantEarning', 0] },
                '$restaurantEarning',
                {
                  $multiply: [
                    {
                      $max: [
                        {
                          $subtract: [
                            { $ifNull: ['$subtotal', 0] },
                            { $ifNull: ['$discount', 0] }
                          ]
                        },
                        0
                      ]
                    },
                    { $ifNull: ['$restaurantPayoutRateSnapshot', 0.75] }
                  ]
                }
              ]
            }
          }
        }
      }
    ]);

    // Get hourly order distribution (peak hours)
    const hourlyDistribution = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get top selling items
    const topItems = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: 'delivered',
          createdAt: { $gte: start, $lte: end }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      deliveredOrders: 0,
      totalRevenue: 0,
      totalOrderValue: 0
    };

    successResponse(res, 200, 'Analytics retrieved successfully', {
      overview: {
        totalOrders: stats.totalOrders,
        deliveredOrders: stats.deliveredOrders,
        totalRevenue: stats.totalRevenue,
        totalOrderValue: stats.totalOrderValue,
        avgOrderValue: stats.deliveredOrders > 0 ? stats.totalRevenue / stats.deliveredOrders : 0
      },
      dailyRevenue,
      paymentBreakdown,
      hourlyDistribution,
      topItems,
      period: {
        start,
        end,
        days: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    errorResponse(res, 500, 'Failed to get analytics', error.message);
  }
};
