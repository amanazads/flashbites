const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const Address = require('../models/Address');
const Notification = require('../models/Notification');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const PlatformSettings = require('../models/PlatformSettings');
const FeeTemplate = require('../models/FeeTemplate');
const { notifyCouponAvailable, notifyUser } = require('../utils/notificationService');
const { sendRestaurantLoginInvite } = require('../utils/emailService');
const { sendDirectSms } = require('../utils/notificationService');
const { normalizeDeliveryZone } = require('../utils/deliveryGeo');
const { cacheGet, cacheSet, cacheDelByPrefix } = require('../utils/memoryCache');
const crypto = require('crypto');

const ADMIN_CACHE_PREFIX = 'admin:';
const ANALYTICS_CACHE_TTL_MS = 30000;
const TRACKING_CACHE_TTL_MS = 15000;

const makeCacheKey = (scope, payload = {}) => `${ADMIN_CACHE_PREFIX}${scope}:${JSON.stringify(payload)}`;
const invalidateAdminCache = () => cacheDelByPrefix(ADMIN_CACHE_PREFIX);

const normalizeDeliveryPartnerPayout = (payload = {}) => {
  const perOrder = Number(payload.perOrder);
  const bonusThreshold = Number(payload.bonusThreshold);
  const bonusAmount = Number(payload.bonusAmount);

  return {
    perOrder: Number.isFinite(perOrder) && perOrder >= 0 ? perOrder : 40,
    bonusThreshold: Number.isFinite(bonusThreshold) && bonusThreshold > 0 ? bonusThreshold : 13,
    bonusAmount: Number.isFinite(bonusAmount) && bonusAmount >= 0 ? bonusAmount : 850
  };
};

const normalizeTemplateTaxRate = (rawValue) => {
  const rate = Number(rawValue);
  if (!Number.isFinite(rate)) return 0.05;
  if (rate < 0) return 0;
  if (rate > 1) return Math.min(1, rate / 100);
  return rate;
};

const normalizeTemplateCommissionPercent = (rawValue) => {
  const percent = Number(rawValue);
  if (!Number.isFinite(percent)) return 25;
  if (percent < 0) return 0;
  if (percent <= 1) return Math.min(90, percent * 100);
  return Math.min(90, percent);
};

const normalizeBillingVisibility = (visibility = {}) => ({
  customer: {
    deliveryFee: visibility.customer?.deliveryFee !== false,
    platformFee: visibility.customer?.platformFee !== false,
    tax: visibility.customer?.tax !== false
  },
  restaurant: {
    deliveryFee: visibility.restaurant?.deliveryFee !== false,
    platformFee: visibility.restaurant?.platformFee !== false,
    tax: visibility.restaurant?.tax !== false
  }
});

const normalizeSettingsPayload = (payload = {}) => {
  const commissionPercent = Number(payload.commissionPercent);
  const deliveryFee = Number(payload.deliveryFee);
  const platformFee = Number(payload.platformFee);
  const taxRate = Number(payload.taxRate);
  const restaurantPayoutRate = Number(payload.restaurantPayoutRate);

  const deliveryChargeRules = Array.isArray(payload.deliveryChargeRules)
    ? payload.deliveryChargeRules
        .map(rule => ({
          minDistance: Number(rule.minDistance),
          maxDistance: Number(rule.maxDistance),
          charge: Number(rule.charge)
        }))
        .filter(rule => Number.isFinite(rule.minDistance) && Number.isFinite(rule.maxDistance) && Number.isFinite(rule.charge))
    : null;

  const promoBanners = Array.isArray(payload.promoBanners)
    ? payload.promoBanners
        .map((banner, index) => ({
          tag: typeof banner.tag === 'string' ? banner.tag.trim() : undefined,
          bold: typeof banner.bold === 'string' ? banner.bold.trim() : undefined,
          sub: typeof banner.sub === 'string' ? banner.sub.trim() : undefined,
          cta: typeof banner.cta === 'string' ? banner.cta.trim() : undefined,
          bg: typeof banner.bg === 'string' ? banner.bg.trim() : undefined,
          img: typeof banner.img === 'string' ? banner.img.trim() : undefined,
          isActive: banner.isActive !== undefined ? Boolean(banner.isActive) : true,
          sortOrder: Number.isFinite(Number(banner.sortOrder)) ? Number(banner.sortOrder) : index
        }))
        .filter((banner) => banner.bold || banner.sub || banner.img)
    : null;

  const deliveryPartnerPayout = payload.deliveryPartnerPayout
    ? normalizeDeliveryPartnerPayout(payload.deliveryPartnerPayout)
    : null;

  const feeVisibility = payload.feeVisibility && typeof payload.feeVisibility === 'object'
    ? {
        customer: {
          deliveryFee: payload.feeVisibility.customer?.deliveryFee !== false,
          platformFee: payload.feeVisibility.customer?.platformFee !== false,
          tax: payload.feeVisibility.customer?.tax !== false
        },
        restaurant: {
          deliveryFee: payload.feeVisibility.restaurant?.deliveryFee !== false,
          platformFee: payload.feeVisibility.restaurant?.platformFee !== false,
          tax: payload.feeVisibility.restaurant?.tax !== false
        }
      }
    : undefined;

  return {
    commissionPercent: Number.isFinite(commissionPercent)
      ? Math.min(90, Math.max(0, commissionPercent))
      : undefined,
    deliveryFee: Number.isFinite(deliveryFee)
      ? Math.max(0, deliveryFee)
      : undefined,
    platformFee: Number.isFinite(platformFee) ? platformFee : undefined,
    taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
    restaurantPayoutRate: Number.isFinite(restaurantPayoutRate)
      ? Math.min(1, Math.max(0, restaurantPayoutRate))
      : undefined,
    deliveryChargeRules: deliveryChargeRules && deliveryChargeRules.length > 0 ? deliveryChargeRules : undefined,
    promoBanners: promoBanners ? promoBanners : undefined,
    deliveryPartnerPayout: deliveryPartnerPayout || undefined,
    feeVisibility
  };
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const cacheKey = makeCacheKey('dashboard');
    const cached = cacheGet(cacheKey);
    if (cached) {
      return successResponse(res, 200, 'Dashboard stats retrieved', cached);
    }

    // Get total counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalRestaurants = await Restaurant.countDocuments({ isApproved: true });
    const totalOrders = await Order.countDocuments();
    const pendingApprovals = await Restaurant.countDocuments({ isApproved: false });

    // Get revenue stats
    const revenueStats = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .sort('-createdAt')
      .limit(10)
      .populate('userId', 'name')
      .populate('restaurantId', 'name');

    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const payload = {
      overview: {
        totalUsers,
        totalRestaurants,
        totalOrders,
        pendingApprovals,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        totalTransactions: revenueStats[0]?.totalTransactions || 0
      },
      ordersByStatus,
      recentOrders,
      monthlyRevenue
    };

    cacheSet(cacheKey, payload, ANALYTICS_CACHE_TTL_MS);
    successResponse(res, 200, 'Dashboard stats retrieved', payload);
  } catch (error) {
    errorResponse(res, 500, 'Failed to get dashboard stats', error.message);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    let query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    successResponse(res, 200, 'Users retrieved successfully', {
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get users', error.message);
  }
};

// @desc    Get delivery partner duty board
// @route   GET /api/admin/delivery-partners/duty-board
// @access  Private (Admin)
exports.getDeliveryPartnerDutyBoard = async (req, res) => {
  try {
    const partners = await User.find({ role: 'delivery_partner' })
      .select('name phone email isActive isOnDuty dutyStatusUpdatedAt lastLocationUpdate location createdAt')
      .sort({ isOnDuty: -1, dutyStatusUpdatedAt: -1, createdAt: -1 })
      .lean();

    const partnerIds = partners.map((p) => p._id);

    const activeOrders = await Order.find({
      deliveryPartnerId: { $in: partnerIds },
      status: { $in: ['confirmed', 'ready', 'out_for_delivery'] }
    })
      .populate('restaurantId', 'name address')
      .populate('addressId', 'street city state zipCode landmark')
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    const assignmentsByPartner = activeOrders.reduce((acc, order) => {
      const pid = String(order.deliveryPartnerId);
      if (!acc[pid]) acc[pid] = [];

      acc[pid].push({
        orderId: order._id,
        orderNumber: order.orderNumber || String(order._id).slice(-8),
        status: order.status,
        assignedAt: order.createdAt,
        customer: {
          name: order.userId?.name || 'Customer',
          phone: order.userId?.phone || ''
        },
        from: {
          restaurantName: order.restaurantId?.name || 'Restaurant',
          address: [
            order.restaurantId?.address?.street,
            order.restaurantId?.address?.city,
            order.restaurantId?.address?.state,
            order.restaurantId?.address?.zipCode
          ].filter(Boolean).join(', ')
        },
        to: {
          address: [
            order.addressId?.street,
            order.addressId?.landmark,
            order.addressId?.city,
            order.addressId?.state,
            order.addressId?.zipCode
          ].filter(Boolean).join(', ')
        }
      });

      return acc;
    }, {});

    const dutyBoard = partners.map((partner) => {
      const partnerAssignments = assignmentsByPartner[String(partner._id)] || [];

      return {
        _id: partner._id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        isActive: partner.isActive,
        isOnDuty: Boolean(partner.isOnDuty),
        dutyStatusUpdatedAt: partner.dutyStatusUpdatedAt || null,
        lastLocationUpdate: partner.lastLocationUpdate || null,
        location: partner.location,
        activeAssignmentsCount: partnerAssignments.length,
        activeAssignments: partnerAssignments,
        currentAssignment: partnerAssignments[0] || null
      };
    });

    return successResponse(res, 200, 'Delivery partner duty board fetched successfully', {
      dutyBoard,
      summary: {
        totalPartners: dutyBoard.length,
        onDutyCount: dutyBoard.filter((p) => p.isOnDuty).length,
        offDutyCount: dutyBoard.filter((p) => !p.isOnDuty).length,
        activelyDeliveringCount: dutyBoard.filter((p) => p.activeAssignmentsCount > 0).length
      }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch delivery partner duty board', error.message);
  }
};

// @desc    Get delivery partner earnings control data
// @route   GET /api/admin/delivery-partners/earnings-control
// @access  Private (Admin)
exports.getDeliveryPartnerEarningsControl = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne().select('deliveryPartnerPayout').lean();
    if (!settings) {
      settings = await PlatformSettings.create({});
      settings = settings.toObject();
    }

    const globalConfig = normalizeDeliveryPartnerPayout(settings.deliveryPartnerPayout || {});

    const partners = await User.find({ role: 'delivery_partner' })
      .select('name phone email isActive isOnDuty deliveryPayoutOverride createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const partnerIds = partners.map((partner) => partner._id);
    const deliveryStats = partnerIds.length
      ? await Order.aggregate([
          {
            $match: {
              deliveryPartnerId: { $in: partnerIds },
              status: 'delivered'
            }
          },
          {
            $group: {
              _id: '$deliveryPartnerId',
              totalDeliveries: { $sum: 1 },
              totalEarnings: {
                $sum: {
                  $cond: [
                    { $gt: ['$deliveryEarning', 0] },
                    '$deliveryEarning',
                    {
                      $cond: [
                        { $gt: ['$deliveryPartnerEarning', 0] },
                        '$deliveryPartnerEarning',
                        {
                          $add: [
                            { $ifNull: ['$deliveryPartnerPayoutSnapshot.perOrder', 0] },
                            {
                              $cond: [
                                { $eq: ['$deliveryPartnerPayoutSnapshot.bonusApplied', true] },
                                { $ifNull: ['$deliveryPartnerPayoutSnapshot.bonusAmount', 0] },
                                0
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        ])
      : [];

    const statsMap = new Map(deliveryStats.map((item) => [String(item._id), item]));

    const partnerControls = partners.map((partner) => {
      const override = partner.deliveryPayoutOverride || {};
      const hasOverride = Boolean(override.isActive);
      const effectiveConfig = hasOverride
        ? normalizeDeliveryPartnerPayout(override)
        : globalConfig;
      const stats = statsMap.get(String(partner._id));

      return {
        _id: partner._id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        isActive: partner.isActive,
        isOnDuty: Boolean(partner.isOnDuty),
        overrideConfig: hasOverride ? normalizeDeliveryPartnerPayout(override) : null,
        effectiveConfig,
        hasOverride,
        stats: {
          totalDeliveries: stats?.totalDeliveries || 0,
          totalEarnings: stats?.totalEarnings || 0
        }
      };
    });

    return successResponse(res, 200, 'Delivery partner earnings control loaded', {
      globalConfig,
      partners: partnerControls
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to load delivery partner earnings control', error.message);
  }
};

// @desc    Update global delivery partner earnings config
// @route   PUT /api/admin/delivery-partners/earnings-control/global
// @access  Private (Admin)
exports.updateGlobalDeliveryPartnerEarningsConfig = async (req, res) => {
  try {
    const globalConfig = normalizeDeliveryPartnerPayout(req.body || {});

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: { deliveryPartnerPayout: globalConfig } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    invalidateAdminCache();
    return successResponse(res, 200, 'Global delivery earnings config updated', {
      globalConfig: settings.deliveryPartnerPayout
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update global delivery earnings config', error.message);
  }
};

// @desc    Update delivery partner-specific earnings config
// @route   PUT /api/admin/delivery-partners/:id/earnings-control
// @access  Private (Admin)
exports.updateDeliveryPartnerEarningsConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const resetToGlobal = Boolean(req.body?.resetToGlobal);

    const partner = await User.findOne({ _id: id, role: 'delivery_partner' }).select('_id');
    if (!partner) {
      return errorResponse(res, 404, 'Delivery partner not found');
    }

    if (resetToGlobal) {
      await User.updateOne(
        { _id: id },
        {
          $set: {
            deliveryPayoutOverride: {
              isActive: false,
              perOrder: 0,
              bonusThreshold: 13,
              bonusAmount: 0
            }
          }
        }
      );

      invalidateAdminCache();
      return successResponse(res, 200, 'Partner earnings reset to global settings');
    }

    const overrideConfig = normalizeDeliveryPartnerPayout(req.body || {});

    await User.updateOne(
      { _id: id },
      {
        $set: {
          deliveryPayoutOverride: {
            isActive: true,
            ...overrideConfig
          }
        }
      }
    );

    invalidateAdminCache();
    return successResponse(res, 200, 'Partner earnings config updated', {
      overrideConfig
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update partner earnings config', error.message);
  }
};

// @desc    Reset all partner-specific earnings configs
// @route   PUT /api/admin/delivery-partners/earnings-control/reset-all
// @access  Private (Admin)
exports.resetAllDeliveryPartnerEarningsOverrides = async (req, res) => {
  try {
    const result = await User.updateMany(
      { role: 'delivery_partner', 'deliveryPayoutOverride.isActive': true },
      {
        $set: {
          deliveryPayoutOverride: {
            isActive: false,
            perOrder: 0,
            bonusThreshold: 13,
            bonusAmount: 0
          }
        }
      }
    );

    invalidateAdminCache();
    return successResponse(res, 200, 'All partner earning overrides reset to global', {
      updatedCount: result.modifiedCount || 0
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reset partner earning overrides', error.message);
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('restaurantId', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments(query);

    successResponse(res, 200, 'Orders retrieved successfully', {
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get orders', error.message);
  }
};

// @desc    Get platform settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
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

// @desc    Update platform settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
exports.updatePlatformSettings = async (req, res) => {
  try {
    const updates = normalizeSettingsPayload(req.body);

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    invalidateAdminCache();
    successResponse(res, 200, 'Platform settings updated', { settings });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update platform settings', error.message);
  }
};

// @desc    Get all restaurants
// @route   GET /api/admin/restaurants
// @access  Private (Admin)
exports.getAllRestaurants = async (req, res) => {
  try {
    const { isApproved, isActive } = req.query;
    let query = {};

    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const restaurants = await Restaurant.find(query)
      .populate('ownerId', 'name email phone')
      .sort('-createdAt');

    successResponse(res, 200, 'Restaurants retrieved successfully', {
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get restaurants', error.message);
  }
};

// @desc    Get onboarding detail for one restaurant
// @route   GET /api/admin/restaurants/:id/onboarding
// @access  Private (Admin)
exports.getRestaurantOnboardingDetail = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('ownerId', 'name email phone approvalStatus isApproved')
      .populate('onboardingMeta.latestGeneratedCredentials.generatedBy', 'name email')
      .lean();

    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    return successResponse(res, 200, 'Restaurant onboarding details fetched', { restaurant });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch restaurant onboarding details', error.message);
  }
};

// @desc    Regenerate temporary login credentials and send invite
// @route   POST /api/admin/restaurants/:id/regenerate-login
// @access  Private (Admin)
exports.regenerateRestaurantLoginCredentials = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('ownerId', 'name email phone');
    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    const owner = await User.findById(restaurant.ownerId?._id).select('+password');
    if (!owner) {
      return errorResponse(res, 404, 'Restaurant owner account not found');
    }

    const random = crypto.randomBytes(6).toString('hex').slice(0, 6);
    // Always satisfy password validator: lowercase + uppercase + special + min length
    const tempPassword = `fb${random}A!`;

    owner.password = tempPassword;
    owner.isActive = true;
    await owner.save();

    const username = owner.email || owner.phone;
    if (!restaurant.onboardingMeta) {
      restaurant.onboardingMeta = {};
    }
    restaurant.onboardingMeta.onboardingStatus = 'verified';
    restaurant.onboardingMeta.latestGeneratedCredentials = {
      username,
      tempPassword,
      generatedAt: new Date(),
      generatedBy: req.user._id
    };
    await restaurant.save();

    const emailSent = owner.email
      ? await sendRestaurantLoginInvite({
          email: owner.email,
          ownerName: owner.name,
          restaurantName: restaurant.name,
          loginPortal: restaurant.onboardingMeta?.loginPortal || '/accounts/restaurant/login',
          username,
          tempPassword,
          loginReferenceId: restaurant.onboardingMeta?.loginReferenceId || ''
        })
      : false;

    const smsBody = `FlashBites: Temp login for ${restaurant.name}. Portal: ${restaurant.onboardingMeta?.loginPortal || '/accounts/restaurant/login'} Username: ${username} Password: ${tempPassword} Ref: ${restaurant.onboardingMeta?.loginReferenceId || 'N/A'}`;
    const smsSent = owner.phone ? await sendDirectSms(owner.phone, smsBody) : false;

    return successResponse(res, 200, 'Temporary login credentials generated', {
      restaurantId: restaurant._id,
      ownerId: owner._id,
      username,
      tempPassword,
      loginPortal: restaurant.onboardingMeta?.loginPortal || '/accounts/restaurant/login',
      loginReferenceId: restaurant.onboardingMeta?.loginReferenceId || '',
      emailSent,
      smsSent
    });
  } catch (error) {
    console.error('regenerateRestaurantLoginCredentials error:', error);
    return errorResponse(res, 500, 'Failed to regenerate login credentials', error.message);
  }
};

// @desc    Approve/reject restaurant
// @route   PATCH /api/admin/restaurants/:id/approve
// @access  Private (Admin)
exports.approveRestaurant = async (req, res) => {
  try {
    const { isApproved } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    await User.findByIdAndUpdate(restaurant.ownerId, {
      isApproved: Boolean(isApproved),
      approvalStatus: isApproved ? 'approved' : 'pending',
      approvalNote: '',
      approvalReviewedAt: new Date(),
      approvalReviewedBy: req.user._id
    });

    invalidateAdminCache();
    successResponse(res, 200, `Restaurant ${isApproved ? 'approved' : 'rejected'}`, { restaurant });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update restaurant status', error.message);
  }
};

// @desc    Block/unblock user
// @route   PATCH /api/admin/users/:id/block
// @access  Private (Admin)
exports.blockUser = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    invalidateAdminCache();
    successResponse(res, 200, `User ${isActive ? 'unblocked' : 'blocked'}`, { user });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update user status', error.message);
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'restaurant_owner', 'delivery_partner', 'admin'];

    if (!validRoles.includes(role)) {
      return errorResponse(res, 400, 'Invalid role specified');
    }

    const targetUser = await User.findById(req.params.id).select('-password -refreshToken');

    if (!targetUser) {
      return errorResponse(res, 404, 'User not found');
    }

    const isSelf = targetUser._id.toString() === req.user._id.toString();
    if (isSelf && role !== 'admin') {
      return errorResponse(res, 400, 'You cannot remove your own admin role');
    }

    if (targetUser.role === 'admin' && role !== 'admin') {
      const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });
      if (totalAdmins <= 1) {
        return errorResponse(res, 400, 'At least one active admin must remain');
      }
    }

    targetUser.role = role;
    await targetUser.save();

    invalidateAdminCache();
    successResponse(res, 200, 'User role updated successfully', { user: targetUser });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update user role', error.message);
  }
};

// @desc    Approve/reject business user account
// @route   PATCH /api/admin/users/:id/approval
// @access  Private (Admin)
exports.updateUserApproval = async (req, res) => {
  try {
    const { isApproved, status, reason } = req.body;

    const resolvedStatus = status || (isApproved === true ? 'approved' : isApproved === false ? 'pending' : null);
    const validStatuses = ['approved', 'pending', 'rejected'];

    if (!validStatuses.includes(resolvedStatus)) {
      return errorResponse(res, 400, 'status must be one of approved, pending, or rejected');
    }

    if (resolvedStatus === 'rejected' && !String(reason || '').trim()) {
      return errorResponse(res, 400, 'Rejection reason is required');
    }

    const user = await User.findById(req.params.id).select('-password -refreshToken');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (!['restaurant_owner', 'delivery_partner'].includes(user.role)) {
      return errorResponse(res, 400, 'Only business accounts can be approved or rejected');
    }

    user.approvalStatus = resolvedStatus;
    user.isApproved = resolvedStatus === 'approved';
    user.approvalNote = resolvedStatus === 'approved' ? '' : String(reason || '').trim();
    user.approvalReviewedAt = new Date();
    user.approvalReviewedBy = req.user._id;
    await user.save();

    if (user.role === 'restaurant_owner') {
      await Restaurant.updateMany({ ownerId: user._id }, { isApproved: resolvedStatus === 'approved' });
    }

    invalidateAdminCache();
    successResponse(res, 200, `Business account marked as ${resolvedStatus}`, { user });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update approval status', error.message);
  }
};

// @desc    Create coupon
// @route   POST /api/admin/coupons
// @access  Private (Admin)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      validFrom,
      validTill,
      usageLimit,
      applicableRestaurants,
      userSpecific,
      applicableUsers,
      autoApply
    } = req.body;

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxDiscount,
      validFrom,
      validTill,
      usageLimit,
      applicableRestaurants,
      userSpecific: userSpecific || false,
      applicableUsers: applicableUsers || [],
      autoApply: autoApply || false,
      createdBy: req.user._id
    });

    // Notify users about new coupon
    if (userSpecific && applicableUsers && applicableUsers.length > 0) {
      await notifyCouponAvailable(applicableUsers, coupon);
    } else if (!userSpecific) {
      // Notify all users
      const allUsers = await User.find({ role: 'user', isActive: true }).select('_id');
      const userIds = allUsers.map(u => u._id);
      await notifyCouponAvailable(userIds, coupon);
    }

    invalidateAdminCache();
    successResponse(res, 201, 'Coupon created successfully', { coupon });
  } catch (error) {
    errorResponse(res, 500, 'Failed to create coupon', error.message);
  }
};

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private (Admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = {};
    if (status === 'active') {
      filter.isActive = true;
      filter.validTill = { $gte: new Date() };
    } else if (status === 'expired') {
      filter.validTill = { $lt: new Date() };
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const coupons = await Coupon.find(filter)
      .populate('createdBy', 'name email')
      .populate('applicableRestaurants', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Coupon.countDocuments(filter);

    successResponse(res, 200, 'Coupons fetched successfully', {
      coupons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch coupons', error.message);
  }
};

// @desc    Update coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private (Admin)
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return errorResponse(res, 404, 'Coupon not found');
    }

    invalidateAdminCache();
    successResponse(res, 200, 'Coupon updated successfully', { coupon });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update coupon', error.message);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private (Admin)
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return errorResponse(res, 404, 'Coupon not found');
    }

    invalidateAdminCache();
    successResponse(res, 200, 'Coupon deleted successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete coupon', error.message);
  }
};

// @desc    Get comprehensive admin analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
exports.getComprehensiveAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, period = '30' } = req.query;
    const cacheKey = makeCacheKey('analytics', { startDate, endDate, period });
    const cached = cacheGet(cacheKey);
    if (cached) {
      return successResponse(res, 200, 'Comprehensive analytics retrieved', cached);
    }

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));

    // Overall statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalRestaurants = await Restaurant.countDocuments({ isApproved: true });
    const activeRestaurants = await Restaurant.countDocuments({ isApproved: true, isActive: true });
    const pendingRestaurants = await Restaurant.countDocuments({ isApproved: false });

    // Delivery partner stats
    const totalDeliveryPartners = await User.countDocuments({ role: 'delivery_partner' });
    const deliveryPartnerStats = await Order.aggregate([
      {
        $match: {
          deliveryPartnerId: { $exists: true, $ne: null },
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$deliveryPartnerId',
          totalDeliveries: { $sum: 1 },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'partner'
        }
      },
      {
        $unwind: '$partner'
      },
      {
        $project: {
          name: '$partner.name',
          phone: '$partner.phone',
          totalDeliveries: 1,
          completedDeliveries: 1
        }
      },
      { $sort: { totalDeliveries: -1 } },
      { $limit: 20 }
    ]);

    // Order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
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
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] }
          },
          totalPlatformProfit: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                { $ifNull: ['$platformProfit', 0] },
                0
              ]
            }
          },
          totalRestaurantEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                { $ifNull: ['$restaurantEarning', 0] },
                0
              ]
            }
          },
          totalDeliveryEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                {
                  $cond: [
                    { $gt: ['$deliveryEarning', 0] },
                    '$deliveryEarning',
                    {
                      $cond: [
                        { $gt: ['$deliveryPartnerEarning', 0] },
                        '$deliveryPartnerEarning',
                        0
                      ]
                    }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);

    // Payment method breakdown
    const paymentBreakdown = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    // Cash collection details (COD orders)
    const cashOrders = await Order.find({
      paymentMethod: 'cod',
      status: 'delivered',
      createdAt: { $gte: start, $lte: end }
    })
      .populate('restaurantId', 'name')
      .populate('deliveryPartnerId', 'name phone')
      .populate('userId', 'name phone')
      .select('orderNumber total createdAt restaurantId deliveryPartnerId userId')
      .sort('-createdAt')
      .limit(100);

    // Orders by restaurant
    const ordersByRestaurant = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$restaurantId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $unwind: '$restaurant'
      },
      {
        $project: {
          name: '$restaurant.name',
          isActive: '$restaurant.isActive',
          totalOrders: 1,
          totalRevenue: 1,
          avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Daily revenue trend
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
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
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Restaurant status breakdown
    const restaurantStatus = {
      total: totalRestaurants + pendingRestaurants,
      active: activeRestaurants,
      inactive: await Restaurant.countDocuments({ isApproved: true, isActive: false }),
      pending: pendingRestaurants
    };

    const stats = orderStats[0] || {
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      totalPlatformProfit: 0,
      totalRestaurantEarnings: 0,
      totalDeliveryEarnings: 0
    };

    const etaStats = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          etaMinutes: { $gt: 0 },
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $project: {
          etaMinutes: 1,
          isOnTime: {
            $cond: [
              {
                $and: [
                  { $ifNull: ['$deliveredAt', false] },
                  { $ifNull: ['$estimatedDelivery', false] },
                  { $lte: ['$deliveredAt', '$estimatedDelivery'] }
                ]
              },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgEtaMinutes: { $avg: '$etaMinutes' },
          maxEtaMinutes: { $max: '$etaMinutes' },
          minEtaMinutes: { $min: '$etaMinutes' },
          onTimeDeliveries: { $sum: '$isOnTime' },
          totalWithEta: { $sum: 1 }
        }
      }
    ]);

    // Calculate cash vs online breakdown
    const cashPayment = paymentBreakdown.find(p => p._id === 'cod') || { count: 0, totalAmount: 0 };
    const onlinePayment = paymentBreakdown.find(p => p._id === 'online') || { count: 0, totalAmount: 0 };

    const etaMetrics = etaStats[0] || {
      avgEtaMinutes: 0,
      maxEtaMinutes: 0,
      minEtaMinutes: 0,
      onTimeDeliveries: 0,
      totalWithEta: 0,
    };

    const payload = {
      overview: {
        totalUsers,
        totalRestaurants,
        activeRestaurants,
        pendingRestaurants,
        totalDeliveryPartners,
        totalOrders: stats.totalOrders,
        deliveredOrders: stats.deliveredOrders,
        cancelledOrders: stats.cancelledOrders,
        totalRevenue: stats.totalRevenue,
        totalPlatformProfit: stats.totalPlatformProfit,
        totalRestaurantEarnings: stats.totalRestaurantEarnings,
        totalDeliveryEarnings: stats.totalDeliveryEarnings,
        avgOrderValue: stats.deliveredOrders > 0 ? stats.totalRevenue / stats.deliveredOrders : 0
      },
      restaurantStatus,
      ordersByRestaurant,
      deliveryPartnerStats,
      paymentBreakdown: {
        cash: {
          count: cashPayment.count,
          amount: cashPayment.totalAmount,
          percentage: stats.totalRevenue > 0 ? (cashPayment.totalAmount / stats.totalRevenue * 100).toFixed(2) : 0
        },
        online: {
          count: onlinePayment.count,
          amount: onlinePayment.totalAmount,
          percentage: stats.totalRevenue > 0 ? (onlinePayment.totalAmount / stats.totalRevenue * 100).toFixed(2) : 0
        }
      },
      cashOrders: cashOrders.map(order => ({
        orderNumber: order.orderNumber,
        amount: order.total,
        date: order.createdAt,
        restaurant: order.restaurantId?.name || 'N/A',
        deliveryPartner: order.deliveryPartnerId?.name || 'Not Assigned',
        deliveryPartnerPhone: order.deliveryPartnerId?.phone || 'N/A',
        customer: order.userId?.name || 'N/A'
      })),
      dailyRevenue,
      etaMetrics: {
        avgEtaMinutes: Number((etaMetrics.avgEtaMinutes || 0).toFixed(1)),
        maxEtaMinutes: etaMetrics.maxEtaMinutes || 0,
        minEtaMinutes: etaMetrics.minEtaMinutes || 0,
        onTimeDeliveryRate: etaMetrics.totalWithEta > 0
          ? Number(((etaMetrics.onTimeDeliveries / etaMetrics.totalWithEta) * 100).toFixed(2))
          : 0,
        totalWithEta: etaMetrics.totalWithEta || 0,
      },
      period: {
        start,
        end,
        days: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
      }
    };

    cacheSet(cacheKey, payload, ANALYTICS_CACHE_TTL_MS);
    successResponse(res, 200, 'Comprehensive analytics retrieved', payload);
  } catch (error) {
    console.error('Admin analytics error:', error);
    errorResponse(res, 500, 'Failed to get analytics', error.message);
  }
};

// @desc    Get account deletion requests
// @route   GET /api/admin/account-deletion-requests
// @access  Private (Admin)
exports.getAccountDeletionRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const requests = await AccountDeletionRequest.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const total = await AccountDeletionRequest.countDocuments(query);

    successResponse(res, 200, 'Account deletion requests fetched successfully', {
      requests,
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch account deletion requests', error.message);
  }
};

// @desc    Review account deletion request
// @route   PATCH /api/admin/account-deletion-requests/:id/review
// @access  Private (Admin)
exports.reviewAccountDeletionRequest = async (req, res) => {
  try {
    const { action, adminNotes = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse(res, 400, 'Action must be either approve or reject');
    }

    const deletionRequest = await AccountDeletionRequest.findById(req.params.id);

    if (!deletionRequest) {
      return errorResponse(res, 404, 'Deletion request not found');
    }

    if (deletionRequest.status !== 'pending') {
      return errorResponse(res, 409, 'This request has already been reviewed');
    }

    if (action === 'approve') {
      const userId = deletionRequest.userId;

      await Promise.all([
        Address.deleteMany({ userId }),
        Notification.deleteMany({ recipient: userId }),
        User.findByIdAndDelete(userId)
      ]);

      deletionRequest.status = 'approved';
    } else {
      deletionRequest.status = 'rejected';
    }

    deletionRequest.adminNotes = adminNotes.trim();
    deletionRequest.reviewedBy = req.user._id;
    deletionRequest.reviewedAt = new Date();

    await deletionRequest.save();

    invalidateAdminCache();

    successResponse(
      res,
      200,
      `Deletion request ${action === 'approve' ? 'approved and account deleted' : 'rejected'} successfully`,
      { request: deletionRequest }
    );
  } catch (error) {
    errorResponse(res, 500, 'Failed to review deletion request', error.message);
  }
};

// @desc    Save restaurant delivery zone polygon
// @route   PUT /api/admin/restaurants/:id/delivery-zone
// @access  Private (Admin)
exports.saveRestaurantDeliveryZone = async (req, res) => {
  try {
    const rawCoordinates = req.body?.coordinates;
    const normalizedZone = normalizeDeliveryZone({
      type: 'Polygon',
      coordinates: [rawCoordinates]
    });

    if (!normalizedZone) {
      return errorResponse(res, 400, 'Valid polygon coordinates are required');
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: { deliveryZone: normalizedZone } },
      { new: true, runValidators: true }
    ).select('name deliveryZone');

    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    invalidateAdminCache();
    return successResponse(res, 200, 'Delivery zone saved successfully', { restaurant });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to save delivery zone', error.message);
  }
};

// @desc    Update restaurant payout rate override
// @route   PATCH /api/admin/restaurants/:id/payout-rate
// @access  Private (Admin)
exports.updateRestaurantPayoutRate = async (req, res) => {
  try {
    const {
      payoutRateOverride,
      deliveryFeeOverride,
      platformFeeOverride,
      taxRateOverride,
      commissionPercentOverride,
      feeVisibilityOverride,
      resetToGlobal
    } = req.body || {};

    const hasPayoutOverride = payoutRateOverride !== undefined && payoutRateOverride !== null && String(payoutRateOverride).trim() !== '';
    const hasFeeOverride = [deliveryFeeOverride, platformFeeOverride, taxRateOverride, commissionPercentOverride]
      .some((value) => value !== undefined && value !== null && String(value).trim() !== '');
    const hasVisibilityOverride = feeVisibilityOverride && typeof feeVisibilityOverride === 'object'
      && ['customer', 'restaurant'].some((scope) => {
        const scopeValue = feeVisibilityOverride[scope];
        return scopeValue && ['deliveryFee', 'platformFee', 'tax'].some((field) => Object.prototype.hasOwnProperty.call(scopeValue, field));
      });

    const restaurantDoc = await Restaurant.findById(req.params.id).select('payoutRateOverride feeOverrides feeVisibilityOverrides');
    if (!restaurantDoc) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    let nextOverride = restaurantDoc.payoutRateOverride ?? null;
    if (hasPayoutOverride) {
      const parsedRate = Number(payoutRateOverride);
      if (!Number.isFinite(parsedRate)) {
        return errorResponse(res, 400, 'payoutRateOverride must be a valid number between 0 and 1');
      }
      nextOverride = Math.min(1, Math.max(0, parsedRate));
    } else if (Boolean(resetToGlobal) && !hasFeeOverride) {
      nextOverride = null;
    }

    const nextFeeOverrides = {
      deliveryFee: deliveryFeeOverride === undefined || deliveryFeeOverride === null || deliveryFeeOverride === ''
        ? restaurantDoc.feeOverrides?.deliveryFee ?? null
        : Number(deliveryFeeOverride),
      platformFee: platformFeeOverride === undefined || platformFeeOverride === null || platformFeeOverride === ''
        ? restaurantDoc.feeOverrides?.platformFee ?? null
        : Number(platformFeeOverride),
      taxRate: taxRateOverride === undefined || taxRateOverride === null || taxRateOverride === ''
        ? restaurantDoc.feeOverrides?.taxRate ?? null
        : Number(taxRateOverride),
      commissionPercent: commissionPercentOverride === undefined || commissionPercentOverride === null || commissionPercentOverride === ''
        ? restaurantDoc.feeOverrides?.commissionPercent ?? null
        : Number(commissionPercentOverride)
    };

    let nextFeeVisibilityOverrides = restaurantDoc.feeVisibilityOverrides ?? null;
    if (hasVisibilityOverride) {
      nextFeeVisibilityOverrides = normalizeBillingVisibility({
        customer: {
          ...(restaurantDoc.feeVisibilityOverrides?.customer || {}),
          ...(feeVisibilityOverride.customer || {})
        },
        restaurant: {
          ...(restaurantDoc.feeVisibilityOverrides?.restaurant || {}),
          ...(feeVisibilityOverride.restaurant || {})
        }
      });
    }

    const shouldClearAll = Boolean(resetToGlobal) && !hasPayoutOverride && !hasFeeOverride && !hasVisibilityOverride;
    if (shouldClearAll) {
      nextOverride = null;
      nextFeeOverrides.deliveryFee = null;
      nextFeeOverrides.platformFee = null;
      nextFeeOverrides.taxRate = null;
      nextFeeOverrides.commissionPercent = null;
      nextFeeVisibilityOverrides = null;
    }

    const feeOverrides = {
      deliveryFee: Number.isFinite(Number(nextFeeOverrides.deliveryFee)) && Number(nextFeeOverrides.deliveryFee) >= 0 ? Number(nextFeeOverrides.deliveryFee) : null,
      platformFee: Number.isFinite(Number(nextFeeOverrides.platformFee)) && Number(nextFeeOverrides.platformFee) >= 0 ? Number(nextFeeOverrides.platformFee) : null,
      taxRate: Number.isFinite(Number(nextFeeOverrides.taxRate)) && Number(nextFeeOverrides.taxRate) >= 0 && Number(nextFeeOverrides.taxRate) <= 1 ? Number(nextFeeOverrides.taxRate) : null,
      commissionPercent: Number.isFinite(Number(nextFeeOverrides.commissionPercent)) && Number(nextFeeOverrides.commissionPercent) >= 0 && Number(nextFeeOverrides.commissionPercent) <= 90 ? Number(nextFeeOverrides.commissionPercent) : null
    };

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          payoutRateOverride: nextOverride,
          feeOverrides: feeOverrides,
          feeVisibilityOverrides: nextFeeVisibilityOverrides
        }
      },
      { new: true, runValidators: true }
    )
      .select('name payoutRateOverride feeOverrides feeVisibilityOverrides')
      .lean();

    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    invalidateAdminCache();
    return successResponse(
      res,
      200,
      shouldClearAll ? 'Restaurant payout and billing settings reset to global' : 'Restaurant payout and billing settings updated',
      {
        restaurant
      }
    );
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update restaurant payout rate', error.message);
  }
};

// @desc    Get admin delivery tracking dashboard data
// @route   GET /api/admin/delivery-tracking
// @access  Private (Admin)
exports.getDeliveryTrackingDashboard = async (req, res) => {
  try {
    const cacheKey = makeCacheKey('delivery-tracking');
    const cached = cacheGet(cacheKey);
    if (cached) {
      return successResponse(res, 200, 'Delivery tracking dashboard fetched successfully', cached);
    }

    const activeStatuses = ['confirmed', 'ready', 'out_for_delivery'];

    const activeOrders = await Order.find({ status: { $in: activeStatuses } })
      .populate('restaurantId', 'name location address')
      .populate('userId', 'name phone')
      .populate('deliveryPartnerId', 'name phone location isOnDuty')
      .populate('addressId', 'fullAddress street city state zipCode coordinates lat lng')
      .sort({ updatedAt: -1 })
      .lean();

    const orders = activeOrders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber || String(order._id).slice(-8),
      status: order.status,
      etaMinutes: Number(order.etaMinutes || 0),
      estimatedDelivery: order.estimatedDelivery || null,
      restaurant: {
        name: order.restaurantId?.name || 'Restaurant',
        location: order.restaurantId?.location?.coordinates || null,
      },
      customer: {
        name: order.userId?.name || 'Customer',
        phone: order.userId?.phone || '',
        address: order.addressId?.fullAddress || [
          order.addressId?.street,
          order.addressId?.city,
          order.addressId?.state,
          order.addressId?.zipCode,
        ].filter(Boolean).join(', '),
        location: order.addressId?.coordinates || (Number.isFinite(order.addressId?.lng) && Number.isFinite(order.addressId?.lat)
          ? [order.addressId.lng, order.addressId.lat]
          : null),
      },
      deliveryPartner: order.deliveryPartnerId ? {
        name: order.deliveryPartnerId.name,
        phone: order.deliveryPartnerId.phone,
        isOnDuty: Boolean(order.deliveryPartnerId.isOnDuty),
        location: order.deliveryPartnerLocation?.coordinates || order.deliveryPartnerId.location?.coordinates || null,
        locationLastUpdated: order.deliveryPartnerLocation?.lastUpdated || null,
      } : null,
      updatedAt: order.updatedAt,
      createdAt: order.createdAt,
    }));

    const payload = {
      totalActiveOrders: orders.length,
      outForDeliveryCount: orders.filter((o) => o.status === 'out_for_delivery').length,
      readyCount: orders.filter((o) => o.status === 'ready').length,
      assignedCount: orders.filter((o) => Boolean(o.deliveryPartner)).length,
      orders,
    };

    cacheSet(cacheKey, payload, TRACKING_CACHE_TTL_MS);
    return successResponse(res, 200, 'Delivery tracking dashboard fetched successfully', payload);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch delivery tracking dashboard', error.message);
  }
};

// @desc    Get all fee templates
// @route   GET /api/admin/fee-templates
// @access  Private (Admin)
exports.getAllFeeTemplates = async (req, res) => {
  try {
    const templates = await FeeTemplate.find()
      .populate('createdBy', 'name email')
      .populate('restaurantIds', 'name')
      .sort('-createdAt');

    successResponse(res, 200, 'Fee templates retrieved successfully', { templates });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get fee templates', error.message);
  }
};

// @desc    Create fee template
// @route   POST /api/admin/fee-templates
// @access  Private (Admin)
exports.createFeeTemplate = async (req, res) => {
  try {
    const { name, description, deliveryFee, platformFee, taxRate, commissionPercent } = req.body;

    if (!name || !String(name).trim()) {
      return errorResponse(res, 400, 'Template name is required');
    }

    const existing = await FeeTemplate.findOne({ name: name.trim().toLowerCase() });
    if (existing) {
      return errorResponse(res, 400, 'Template with this name already exists');
    }

    const template = await FeeTemplate.create({
      name: name.trim(),
      description: description ? String(description).trim() : '',
      deliveryFee: Number.isFinite(Number(deliveryFee)) ? Number(deliveryFee) : 0,
      platformFee: Number.isFinite(Number(platformFee)) ? Number(platformFee) : 0,
      taxRate: normalizeTemplateTaxRate(taxRate),
      commissionPercent: normalizeTemplateCommissionPercent(commissionPercent),
      createdBy: req.user._id
    });

    invalidateAdminCache();
    successResponse(res, 201, 'Fee template created successfully', { template });
  } catch (error) {
    errorResponse(res, 500, 'Failed to create fee template', error.message);
  }
};

// @desc    Update fee template
// @route   PUT /api/admin/fee-templates/:id
// @access  Private (Admin)
exports.updateFeeTemplate = async (req, res) => {
  try {
    const { name, description, deliveryFee, platformFee, taxRate, commissionPercent, isActive } = req.body;

    const template = await FeeTemplate.findById(req.params.id);
    if (!template) {
      return errorResponse(res, 404, 'Fee template not found');
    }

    if (name && String(name).trim() && name.trim() !== template.name) {
      const existing = await FeeTemplate.findOne({ name: name.trim().toLowerCase(), _id: { $ne: req.params.id } });
      if (existing) {
        return errorResponse(res, 400, 'Another template with this name already exists');
      }
      template.name = name.trim();
    }

    if (description !== undefined) template.description = String(description || '').trim();
    if (Number.isFinite(Number(deliveryFee))) template.deliveryFee = Number(deliveryFee);
    if (Number.isFinite(Number(platformFee))) template.platformFee = Number(platformFee);
    if (taxRate !== undefined) template.taxRate = normalizeTemplateTaxRate(taxRate);
    if (commissionPercent !== undefined) template.commissionPercent = normalizeTemplateCommissionPercent(commissionPercent);
    if (isActive !== undefined) template.isActive = Boolean(isActive);

    await template.save();

    invalidateAdminCache();
    successResponse(res, 200, 'Fee template updated successfully', { template });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update fee template', error.message);
  }
};

// @desc    Delete fee template
// @route   DELETE /api/admin/fee-templates/:id
// @access  Private (Admin)
exports.deleteFeeTemplate = async (req, res) => {
  try {
    const template = await FeeTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return errorResponse(res, 404, 'Fee template not found');
    }

    // Remove template from all restaurants using it
    if (template.restaurantIds && template.restaurantIds.length > 0) {
      await Restaurant.updateMany(
        { _id: { $in: template.restaurantIds } },
        { $unset: { feeTemplateId: 1 } }
      );
    }

    invalidateAdminCache();
    successResponse(res, 200, 'Fee template deleted successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete fee template', error.message);
  }
};

// @desc    Assign restaurant to fee template
// @route   PUT /api/admin/fee-templates/:id/assign-restaurant
// @access  Private (Admin)
exports.assignRestaurantToTemplate = async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return errorResponse(res, 400, 'restaurantId is required');
    }

    const template = await FeeTemplate.findById(req.params.id);
    if (!template) {
      return errorResponse(res, 404, 'Fee template not found');
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }

    // Remove restaurant from other templates
    await FeeTemplate.updateMany(
      { _id: { $ne: req.params.id } },
      { $pull: { restaurantIds: restaurantId } }
    );

    // Add to this template if not already there
    if (!template.restaurantIds.includes(restaurantId)) {
      template.restaurantIds.push(restaurantId);
      await template.save();
    }

    // Update restaurant with template reference
    await Restaurant.findByIdAndUpdate(restaurantId, { feeTemplateId: req.params.id });

    invalidateAdminCache();
    successResponse(res, 200, 'Restaurant assigned to template successfully', { template });
  } catch (error) {
    errorResponse(res, 500, 'Failed to assign restaurant to template', error.message);
  }
};

// @desc    Remove restaurant from fee template
// @route   PUT /api/admin/fee-templates/:id/remove-restaurant
// @access  Private (Admin)
exports.removeRestaurantFromTemplate = async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return errorResponse(res, 400, 'restaurantId is required');
    }

    const template = await FeeTemplate.findByIdAndUpdate(
      req.params.id,
      { $pull: { restaurantIds: restaurantId } },
      { new: true }
    );

    if (!template) {
      return errorResponse(res, 404, 'Fee template not found');
    }

    await Restaurant.findByIdAndUpdate(restaurantId, { $unset: { feeTemplateId: 1 } });

    invalidateAdminCache();
    successResponse(res, 200, 'Restaurant removed from template successfully', { template });
  } catch (error) {
    errorResponse(res, 500, 'Failed to remove restaurant from template', error.message);
  }
};