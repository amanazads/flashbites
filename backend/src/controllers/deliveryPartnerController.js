const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const PlatformSettings = require('../models/PlatformSettings');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { 
  notifyUserDeliveryAssigned,
  notifyDeliveryPartnerAssignment,
  notifyOrderStatus,
  notifyUser
} = require('../utils/notificationService');
const {
  notifyDeliveryPartnerOrderAssigned,
  notifyDeliveryPartner,
  notifyUserOrderUpdate,
  notifyRestaurantNewOrder: socketNotifyRestaurant,
  emitOrderLocationUpdate,
  emitOrderFinancialUpdate
} = require('../services/socketService');

const DEFAULT_PAYOUT_CONFIG = {
  perOrder: 40,
  bonusThreshold: 13,
  bonusAmount: 850
};

const normalizePayoutConfig = (config = {}) => {
  const perOrder = Number(config.perOrder);
  const bonusThreshold = Number(config.bonusThreshold);
  const bonusAmount = Number(config.bonusAmount);

  return {
    perOrder: Number.isFinite(perOrder) && perOrder >= 0 ? perOrder : DEFAULT_PAYOUT_CONFIG.perOrder,
    bonusThreshold: Number.isFinite(bonusThreshold) && bonusThreshold > 0 ? bonusThreshold : DEFAULT_PAYOUT_CONFIG.bonusThreshold,
    bonusAmount: Number.isFinite(bonusAmount) && bonusAmount >= 0 ? bonusAmount : DEFAULT_PAYOUT_CONFIG.bonusAmount
  };
};

const roundToTwo = (value) => Math.round((Number(value) || 0) * 100) / 100;

const normalizeRestaurantPayoutRate = (rawRate) => {
  const rate = Number(rawRate);
  if (!Number.isFinite(rate)) return 0.75;
  if (rate < 0) return 0;
  if (rate > 1) return 1;
  return rate;
};

const getRestaurantSettlementEarning = (orderLike, payoutRate) => {
  const subtotal = Number(orderLike?.subtotal || 0);
  const discount = Number(orderLike?.discount || 0);
  const baseAmount = Math.max(subtotal - discount, 0);
  return roundToTwo(baseAmount * normalizeRestaurantPayoutRate(payoutRate));
};

const getEffectivePayoutConfig = async (partnerUserId) => {
  const [settings, partner] = await Promise.all([
    PlatformSettings.findOne().select('deliveryPartnerPayout').lean(),
    User.findById(partnerUserId).select('deliveryPayoutOverride').lean()
  ]);

  const globalConfig = normalizePayoutConfig(settings?.deliveryPartnerPayout || DEFAULT_PAYOUT_CONFIG);
  const override = partner?.deliveryPayoutOverride;

  if (override?.isActive) {
    return {
      ...normalizePayoutConfig(override),
      source: 'partner_override'
    };
  }

  return {
    ...globalConfig,
    source: 'global'
  };
};

const getHistoryRangeStart = (timeframe) => {
  const now = new Date();

  if (timeframe === 'day') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (timeframe === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (timeframe === 'month') {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  return null;
};

// @desc    Get all available orders for delivery partners
// @route   GET /api/delivery/orders/available
// @access  Private (Delivery Partner)
exports.getAvailableOrders = async (req, res) => {
  try {
    // Get orders that are ready for delivery or confirmed (not yet assigned)
    const orders = await Order.find({
      status: { $in: ['ready', 'confirmed'] },
      $or: [
        { deliveryPartnerId: { $exists: false } },
        { deliveryPartnerId: null }
      ]
    })
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location')
      .populate('addressId')
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(res, 200, 'Available orders fetched successfully', { orders, count: orders.length });
  } catch (error) {
    console.error('Get available orders error:', error);
    return errorResponse(res, 500, 'Failed to fetch available orders');
  }
};

// @desc    Get delivery partner's assigned orders
// @route   GET /api/delivery/orders/assigned
// @access  Private (Delivery Partner)
exports.getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: { $in: ['out_for_delivery', 'ready', 'confirmed'] }
    })
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location')
      .populate('addressId')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Assigned orders fetched successfully', { orders, count: orders.length });
  } catch (error) {
    console.error('Get assigned orders error:', error);
    return errorResponse(res, 500, 'Failed to fetch assigned orders');
  }
};

// @desc    Accept an order for delivery
// @route   POST /api/delivery/orders/:orderId/accept
// @access  Private (Delivery Partner)
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deliveryPartner = await User.findById(req.user._id).select('isOnDuty');
    if (!deliveryPartner?.isOnDuty) {
      return errorResponse(res, 400, 'You are currently off duty. Turn on duty to accept orders.');
    }

    const acceptedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: { $in: ['ready', 'confirmed'] },
        $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }],
      },
      {
        $set: {
          deliveryPartnerId: req.user._id,
          status: 'out_for_delivery',
        }
      },
      { new: true }
    );

    let orderToReturn = acceptedOrder;
    if (!orderToReturn) {
      const existingOrder = await Order.findById(orderId).select('deliveryPartnerId status');
      if (!existingOrder) {
        return errorResponse(res, 404, 'Order not found');
      }

      if (String(existingOrder.deliveryPartnerId || '') === String(req.user._id) && existingOrder.status === 'out_for_delivery') {
        orderToReturn = existingOrder;
      } else if (existingOrder.deliveryPartnerId) {
        return errorResponse(res, 400, 'Order already assigned to another delivery partner');
      } else {
        return errorResponse(res, 400, 'Order is not available for delivery');
      }
    }

    const updatedOrder = await Order.findById(orderToReturn._id)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location')
      .populate('addressId');

    // Notify user about delivery partner assignment
    try {
      await notifyUserDeliveryAssigned(updatedOrder, req.user);
      
      // Notify delivery partner about assignment (push + database)
      await notifyDeliveryPartnerAssignment(updatedOrder, req.user);
      
      // Send real-time socket notifications
      notifyDeliveryPartnerOrderAssigned(req.user._id.toString(), updatedOrder);
      
      // Notify user via socket about delivery partner assignment
      if (updatedOrder.userId) {
        const userIdStr = updatedOrder.userId._id ? updatedOrder.userId._id.toString() : updatedOrder.userId.toString();
        notifyUserOrderUpdate(userIdStr, updatedOrder);
      }
    } catch (notifyError) {
      console.error('Failed to send delivery assignment notification:', notifyError);
    }

    return successResponse(res, 200, 'Order accepted successfully', { order: updatedOrder });
  } catch (error) {
    console.error('Accept order error:', error);
    return errorResponse(res, 500, 'Failed to accept order');
  }
};

// @desc    Get current delivery partner duty status
// @route   GET /api/delivery/duty-status
// @access  Private (Delivery Partner)
exports.getDutyStatus = async (req, res) => {
  try {
    const deliveryPartner = await User.findById(req.user._id)
      .select('isOnDuty dutyStatusUpdatedAt lastLocationUpdate location');

    if (!deliveryPartner) {
      return errorResponse(res, 404, 'Delivery partner not found');
    }

    return successResponse(res, 200, 'Duty status fetched successfully', {
      isOnDuty: Boolean(deliveryPartner.isOnDuty),
      dutyStatusUpdatedAt: deliveryPartner.dutyStatusUpdatedAt,
      lastLocationUpdate: deliveryPartner.lastLocationUpdate,
      location: deliveryPartner.location
    });
  } catch (error) {
    console.error('Get duty status error:', error);
    return errorResponse(res, 500, 'Failed to fetch duty status');
  }
};

// @desc    Update delivery partner duty status
// @route   PUT /api/delivery/duty-status
// @access  Private (Delivery Partner)
exports.updateDutyStatus = async (req, res) => {
  try {
    const { isOnDuty } = req.body;

    if (typeof isOnDuty !== 'boolean') {
      return errorResponse(res, 400, 'isOnDuty must be a boolean');
    }

    const updatedPartner = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          isOnDuty,
          dutyStatusUpdatedAt: new Date()
        }
      },
      { new: true }
    ).select('isOnDuty dutyStatusUpdatedAt');

    return successResponse(res, 200, 'Duty status updated successfully', {
      isOnDuty: Boolean(updatedPartner?.isOnDuty),
      dutyStatusUpdatedAt: updatedPartner?.dutyStatusUpdatedAt
    });
  } catch (error) {
    console.error('Update duty status error:', error);
    return errorResponse(res, 500, 'Failed to update duty status');
  }
};

// @desc    Mark order as delivered
// @route   POST /api/delivery/orders/:orderId/deliver
// @access  Private (Delivery Partner)
exports.markAsDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    if (!order.deliveryPartnerId || order.deliveryPartnerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'You are not assigned to this order');
    }

    if (order.status === 'delivered') {
      const alreadyDelivered = await Order.findById(orderId)
        .populate('userId', 'name phone')
        .populate('restaurantId', 'name address phone location ownerId')
        .populate('addressId');
      return successResponse(res, 200, 'Order already marked as delivered', { order: alreadyDelivered });
    }

    if (order.status !== 'out_for_delivery') {
      return errorResponse(res, 400, 'Order is not out for delivery');
    }

    const payoutConfig = await getEffectivePayoutConfig(req.user._id);
    const completedBeforeCount = await Order.countDocuments({
      deliveryPartnerId: req.user._id,
      status: 'delivered'
    });
    const completedCountAfterThisOrder = completedBeforeCount + 1;
    const bonusApplied = completedCountAfterThisOrder % payoutConfig.bonusThreshold === 0;
    const partnerEarning = payoutConfig.perOrder + (bonusApplied ? payoutConfig.bonusAmount : 0);

    const [settings, restaurant] = await Promise.all([
      PlatformSettings.findOne().select('restaurantPayoutRate').lean(),
      Restaurant.findById(order.restaurantId).select('totalEarnings')
    ]);

    const existingRestaurantEarning = Number(order.restaurantEarning || 0);
    const settlementRate = normalizeRestaurantPayoutRate(
      order.restaurantPayoutRateSnapshot ?? settings?.restaurantPayoutRate
    );
    const restaurantEarning = existingRestaurantEarning > 0
      ? roundToTwo(existingRestaurantEarning)
      : getRestaurantSettlementEarning(order, settlementRate);
    const adminEarning = roundToTwo((Number(order.total) || 0) - restaurantEarning - partnerEarning);

    // Mark as delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.paymentStatus = 'completed';
    order.deliveryPartnerEarning = partnerEarning;
    order.deliveryEarning = partnerEarning;
    order.restaurantPayoutRateSnapshot = settlementRate;
    order.restaurantEarning = restaurantEarning;
    order.adminEarning = adminEarning;
    order.platformProfit = adminEarning;
    order.totalAmount = Number(order.total || 0);
    order.deliveryPartnerPayoutSnapshot = {
      perOrder: payoutConfig.perOrder,
      bonusThreshold: payoutConfig.bonusThreshold,
      bonusAmount: payoutConfig.bonusAmount,
      bonusApplied
    };
    await order.save();

    if (restaurant && existingRestaurantEarning <= 0) {
      restaurant.totalEarnings = Number(restaurant.totalEarnings || 0) + restaurantEarning;
      await restaurant.save();
    }

    const updatedOrder = await Order.findById(orderId)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location ownerId')
      .populate('addressId');

    try {
      notifyDeliveryPartner(req.user._id.toString(), 'order-status-updated', {
        orderId: updatedOrder._id,
        status: 'delivered',
        order: updatedOrder
      });
      emitOrderFinancialUpdate(updatedOrder);

      // Notify customer delivery completion.
      await notifyOrderStatus(updatedOrder, 'delivered');

      // Notify restaurant owner that delivery partner completed this order.
      if (updatedOrder.restaurantId?.ownerId) {
        const orderRef = updatedOrder.orderNumber || updatedOrder._id.toString().slice(-8);
        await notifyUser(updatedOrder.restaurantId.ownerId, {
          title: '✅ Order Delivered',
          message: `Order #${orderRef} was marked delivered by delivery partner`,
          type: 'restaurant_order_delivered',
          priority: 'medium',
          data: {
            orderId: updatedOrder._id,
            orderNumber: orderRef,
            deliveredBy: req.user._id
          }
        });
      }

      // Real-time restaurant update for dashboard/order list refresh.
      const restaurantIdStr = updatedOrder.restaurantId?._id?.toString();
      if (restaurantIdStr) {
        socketNotifyRestaurant(restaurantIdStr, {
          ...updatedOrder.toObject(),
          type: 'ORDER_DELIVERED',
          message: `Order #${updatedOrder._id.toString().slice(-8)} delivered by delivery partner`
        });
      }

      // Real-time customer update.
      if (updatedOrder.userId?._id) {
        notifyUserOrderUpdate(updatedOrder.userId._id.toString(), updatedOrder);
      }
    } catch (notifyError) {
      console.error('Delivery completion notification error:', notifyError);
    }

    return successResponse(res, 200, 'Order marked as delivered successfully', {
      order: updatedOrder,
      payout: {
        earning: partnerEarning,
        bonusApplied,
        config: payoutConfig,
        completedDeliveries: completedCountAfterThisOrder
      }
    });
  } catch (error) {
    console.error('Mark as delivered error:', error);
    return errorResponse(res, 500, 'Failed to mark order as delivered');
  }
};

// @desc    Get delivery partner's order history
// @route   GET /api/delivery/orders/history
// @access  Private (Delivery Partner)
exports.getOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, timeframe = 'all' } = req.query;
    const normalizedTimeframe = ['day', 'week', 'month', 'all'].includes(String(timeframe))
      ? String(timeframe)
      : 'all';
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;

    const query = {
      deliveryPartnerId: req.user._id,
      status: 'delivered'
    };

    const startDate = getHistoryRangeStart(normalizedTimeframe);
    if (startDate) {
      query.deliveredAt = { $gte: startDate };
    }

    const orders = await Order.find(query)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address')
      .populate('addressId')
      .sort({ deliveredAt: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);

    const count = await Order.countDocuments(query);

    const earningsSummary = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
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
          },
          totalDeliveries: { $sum: 1 }
        }
      }
    ]);

    const groupedByDate = orders.reduce((acc, order) => {
      const dateKey = order.deliveredAt
        ? new Date(order.deliveredAt).toISOString().slice(0, 10)
        : new Date(order.createdAt).toISOString().slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(order);
      return acc;
    }, {});

    const totalEarnings = earningsSummary[0]?.totalEarnings || 0;
    const totalDeliveries = earningsSummary[0]?.totalDeliveries || 0;

    return successResponse(res, 200, 'Order history fetched successfully', {
      orders,
      groupedByDate,
      timeframe: normalizedTimeframe,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      totalOrders: count,
      summary: {
        totalDeliveries,
        totalEarnings,
        avgEarningPerOrder: totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0
      }
    });
  } catch (error) {
    console.error('Get order history error:', error);
    return errorResponse(res, 500, 'Failed to fetch order history');
  }
};

// @desc    Get delivery partner stats
// @route   GET /api/delivery/stats
// @access  Private (Delivery Partner)
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalDeliveries, todayDeliveries, activeOrders, totalEarnings] = await Promise.all([
      Order.countDocuments({ deliveryPartnerId: req.user._id, status: 'delivered' }),
      Order.countDocuments({ 
        deliveryPartnerId: req.user._id, 
        status: 'delivered',
        deliveredAt: { $gte: today }
      }),
      Order.countDocuments({
        deliveryPartnerId: req.user._id,
        status: { $in: ['out_for_delivery', 'ready'] }
      }),
      Order.aggregate([
        { $match: { deliveryPartnerId: req.user._id, status: 'delivered' } },
        {
          $group: {
            _id: null,
            total: {
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
    ]);

    const earnings = totalEarnings.length > 0 ? totalEarnings[0].total : 0;

    return successResponse(res, 200, 'Stats fetched successfully', {
      totalDeliveries,
      todayDeliveries,
      activeOrders,
      totalEarnings: earnings
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse(res, 500, 'Failed to fetch stats');
  }
};

// @desc    Update delivery partner location
// @route   PUT /api/delivery/location
// @access  Private (Delivery Partner)
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, orderId } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return errorResponse(res, 400, 'Latitude and longitude are required');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse(res, 400, 'Invalid latitude or longitude');
    }

    // Update user location
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'location.coordinates': [lng, lat],
        lastLocationUpdate: new Date()
      }
    });

    // If orderId provided, update order tracking
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        deliveryPartnerId: req.user._id,
        status: 'out_for_delivery'
      });

      if (order) {
        const prevLng = Number(order.deliveryPartnerLocation?.coordinates?.[0]);
        const prevLat = Number(order.deliveryPartnerLocation?.coordinates?.[1]);
        const sameCoordinates = Number.isFinite(prevLat) && Number.isFinite(prevLng) && prevLat === lat && prevLng === lng;

        order.deliveryPartnerLocation = {
          type: 'Point',
          coordinates: [lng, lat],
          lastUpdated: new Date()
        };

        if (!sameCoordinates) {
          // Avoid duplicate history entries when the same point is submitted repeatedly.
          order.trackingHistory.push({
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            timestamp: new Date(),
            status: order.status
          });
        }

        await order.save();

        // Emit real-time update via socket
        emitOrderLocationUpdate(orderId, lat, lng, new Date());
      }
    }

    return successResponse(res, 200, 'Location updated successfully', { latitude: lat, longitude: lng });
  } catch (error) {
    console.error('Update location error:', error);
    return errorResponse(res, 500, 'Failed to update location');
  }
};
