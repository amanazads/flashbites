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
const { notifyCouponAvailable, notifyUser } = require('../utils/notificationService');

const normalizeSettingsPayload = (payload = {}) => {
  const platformFee = Number(payload.platformFee);
  const taxRate = Number(payload.taxRate);

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

  return {
    platformFee: Number.isFinite(platformFee) ? platformFee : undefined,
    taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
    deliveryChargeRules: deliveryChargeRules && deliveryChargeRules.length > 0 ? deliveryChargeRules : undefined,
    promoBanners: promoBanners ? promoBanners : undefined
  };
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {

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

    successResponse(res, 200, 'Dashboard stats retrieved', {
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
    });
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

    successResponse(res, 200, 'User role updated successfully', { user: targetUser });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update user role', error.message);
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
      totalRevenue: 0
    };

    // Calculate cash vs online breakdown
    const cashPayment = paymentBreakdown.find(p => p._id === 'cod') || { count: 0, totalAmount: 0 };
    const onlinePayment = paymentBreakdown.find(p => p._id === 'online') || { count: 0, totalAmount: 0 };

    successResponse(res, 200, 'Comprehensive analytics retrieved', {
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
      period: {
        start,
        end,
        days: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
      }
    });
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