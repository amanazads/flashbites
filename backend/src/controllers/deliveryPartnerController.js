const Order = require('../models/Order');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { 
  notifyUserDeliveryAssigned,
  notifyDeliveryPartnerAssignment,
  notifyOrderStatus,
  notifyUser
} = require('../utils/notificationService');
const {
  notifyDeliveryPartnerOrderAssigned,
  notifyUserOrderUpdate,
  notifyRestaurantNewOrder: socketNotifyRestaurant,
  emitOrderLocationUpdate
} = require('../services/socketService');

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

    // Mark as delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.paymentStatus = 'completed';
    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location ownerId')
      .populate('addressId');

    try {
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

    return successResponse(res, 200, 'Order marked as delivered successfully', { order: updatedOrder });
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
    const { page = 1, limit = 20 } = req.query;

    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: 'delivered'
    })
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address')
      .populate('addressId')
      .sort({ deliveredAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments({
      deliveryPartnerId: req.user._id,
      status: 'delivered'
    });

    return successResponse(res, 200, 'Order history fetched successfully', {
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count
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
        { $group: { _id: null, total: { $sum: '$deliveryFee' } } }
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
