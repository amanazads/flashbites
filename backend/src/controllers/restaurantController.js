const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { calculateDistance } = require('../utils/calculateDistance');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/imageUpload');
const { geocodeAddress } = require('../services/locationService');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isFiniteNumber = (value) => Number.isFinite(Number(value));

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

// @desc    Create restaurant
// @route   POST /api/restaurants
// @access  Private (Restaurant Owner)
exports.createRestaurant = async (req, res) => {
  try {
    let { name, email, phone, description, cuisines, address, location, timing, deliveryFee, deliveryTime, deliveryRadiusKm, deliveryRadius } = req.body;

    // Parse JSON strings from FormData
    if (typeof cuisines === 'string') cuisines = JSON.parse(cuisines);
    if (typeof address === 'string') address = JSON.parse(address);
    if (typeof location === 'string') location = JSON.parse(location);
    if (typeof timing === 'string') timing = JSON.parse(timing);

    if (deliveryRadiusKm == null && deliveryRadius != null) {
      deliveryRadiusKm = deliveryRadius;
    }

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
      deliveryRadiusKm,
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

    let query = { isActive: true, isApproved: true };

    // Filter by cuisine
    if (cuisine) {
      query.cuisines = { $in: [cuisine] };
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
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

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        // Fallback gracefully when client sends stale/invalid coords.
        restaurants = await Restaurant.find(query)
          .sort(effectiveSort)
          .skip(skip)
          .limit(safeLimit)
          .select(projection)
          .lean();

        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
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
          const distanceKm = calculateDistance(latNum, lngNum, coords[1], coords[0]);
          const allowedKm = Number(r.deliveryRadiusKm || 20);
          if (!Number.isFinite(distanceKm)) return null;
          if (distanceKm > allowedKm) return null;
          return { ...r, distanceKm: Number(distanceKm.toFixed(2)) };
        })
        .filter(Boolean)
        .slice(0, safeLimit);
    } else {
      restaurants = await Restaurant.find(query)
        .sort(effectiveSort)
        .skip(skip)
        .limit(safeLimit)
        .select(projection)
        .lean();
    }

    // Cache public restaurant list for 30 seconds on CDN/browser
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
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
    const maxDistance = Math.max(Number(req.query.maxDistance || 10000), 1000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return errorResponse(res, 400, 'Valid latitude and longitude are required');
    }

    const restaurants = await Restaurant.aggregate([
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
            isActive: true,
            isApproved: true,
            'location.type': 'Point',
            'location.coordinates.0': { $type: 'number' },
            'location.coordinates.1': { $type: 'number' }
          }
        }
      },
      {
        $addFields: {
          distanceKm: { $divide: ['$distanceMeters', 1000] },
          effectiveDeliveryRadiusKm: { $ifNull: ['$deliveryRadiusKm', 20] }
        }
      },
      {
        $match: {
          $expr: { $lte: ['$distanceKm', '$effectiveDeliveryRadiusKm'] }
        }
      },
      {
        $project: {
          documents: 0,
          bankDetails: 0,
          __v: 0,
          distanceMeters: 0,
          effectiveDeliveryRadiusKm: 0
        }
      },
      {
        $sort: { distanceKm: 1, rating: -1 }
      },
      {
        $limit: Math.min(Math.max(Number(req.query.limit || 50), 1), 100)
      }
    ]);

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
      isActive: true,
      isApproved: true,
      $or: [
        { name: { $regex: regex } },
        { cuisines: { $in: [regex] } }
      ]
    };

    if (city) {
      restaurantQuery['address.city'] = { $regex: city, $options: 'i' };
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
          'restaurant.isApproved': true,
          ...(city ? { 'restaurant.address.city': { $regex: city, $options: 'i' } } : {})
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

    if (!restaurant.isActive || !restaurant.isApproved) {
      return errorResponse(res, 403, 'Restaurant is not available');
    }

    // Cache individual restaurant page for 60 seconds
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
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
          totalEarnings: { $sum: '$total' },
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
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] }
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
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
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
          revenue: { $sum: '$total' }
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