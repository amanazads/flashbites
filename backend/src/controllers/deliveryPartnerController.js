const Order = require('../models/Order');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { notifyUserDeliveryAssigned } = require('../utils/notificationService');

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

    return successResponse(res, { orders, count: orders.length }, 'Available orders fetched successfully');
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

    return successResponse(res, { orders, count: orders.length }, 'Assigned orders fetched successfully');
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

    const order = await Order.findById(orderId);

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    if (order.deliveryPartnerId) {
      return errorResponse(res, 400, 'Order already assigned to another delivery partner');
    }

    if (!['ready', 'confirmed'].includes(order.status)) {
      return errorResponse(res, 400, 'Order is not available for delivery');
    }

    // Assign order to delivery partner
    order.deliveryPartnerId = req.user._id;
    order.status = 'out_for_delivery';
    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location')
      .populate('addressId');

    // Notify user about delivery partner assignment
    try {
      await notifyUserDeliveryAssigned(updatedOrder, req.user);
    } catch (notifyError) {
      console.error('Failed to send delivery assignment notification:', notifyError);
    }

    return successResponse(res, { order: updatedOrder }, 'Order accepted successfully');
  } catch (error) {
    console.error('Accept order error:', error);
    return errorResponse(res, 500, 'Failed to accept order');
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

    if (order.deliveryPartnerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'You are not assigned to this order');
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
      .populate('restaurantId', 'name address phone location')
      .populate('addressId');

    return successResponse(res, { order: updatedOrder }, 'Order marked as delivered successfully');
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

    return successResponse(res, {
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count
    }, 'Order history fetched successfully');
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

    return successResponse(res, {
      totalDeliveries,
      todayDeliveries,
      activeOrders,
      totalEarnings: earnings
    }, 'Stats fetched successfully');
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
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 400, 'Latitude and longitude are required');
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'location.coordinates': [longitude, latitude],
        lastLocationUpdate: new Date()
      }
    });

    return successResponse(res, null, 'Location updated successfully');
  } catch (error) {
    console.error('Update location error:', error);
    return errorResponse(res, 500, 'Failed to update location');
  }
};
