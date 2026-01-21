const Order = require('../models/Order');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { 
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS
} = require('../utils/smsService');
const { 
  notifyUserDeliveryAssigned,
  notifyDeliveryPartnerAssignment
} = require('../utils/notificationService');
const {
  notifyDeliveryPartnerOrderAssigned,
  notifyUserOrderUpdate
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
      
      // Notify delivery partner about assignment (push + database)
      await notifyDeliveryPartnerAssignment(updatedOrder, req.user);
      
      // Send real-time socket notifications
      notifyDeliveryPartnerOrderAssigned(req.user._id.toString(), updatedOrder);
      
      // Notify user via socket about delivery partner assignment
      if (updatedOrder.userId) {
        const userIdStr = updatedOrder.userId._id ? updatedOrder.userId._id.toString() : updatedOrder.userId.toString();
        notifyUserOrderUpdate(userIdStr, updatedOrder);
      }
      
      // Send SMS to customer about out for delivery status
      if (updatedOrder.userId && updatedOrder.userId.phone) {
        await sendOutForDeliverySMS(
          updatedOrder.userId.phone,
          updatedOrder._id.toString(),
          req.user.name,
          req.user.phone
        );
        console.log(`📱 Out for delivery SMS sent to ${updatedOrder.userId.phone}`);
      }
      
      // Send delivery OTP reminder to customer via Email and SMS
      if (updatedOrder.deliveryOtp && updatedOrder.userId) {
        const { sendEmail } = require('../utils/emailService');
        const { sendDeliveryOtpSMS } = require('../utils/smsService');
        
        // Send OTP reminder via email
        if (updatedOrder.userId.email) {
          await sendEmail(
            updatedOrder.userId.email,
            'Your Order is Out for Delivery - OTP Required',
            `<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
              <h2 style="color: #ea580c;">🚚 Order Out for Delivery!</h2>
              <p>Hello ${updatedOrder.userId.name},</p>
              <p>Your order <strong>#${updatedOrder._id.toString().slice(-8)}</strong> is on its way!</p>
              <p><strong>Delivery Partner:</strong> ${req.user.name} (${req.user.phone})</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #ea580c;">
                <p style="margin: 0; font-size: 14px; color: #666;">Your Delivery OTP</p>
                <p style="margin: 10px 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ea580c;">${updatedOrder.deliveryOtp}</p>
                <p style="margin: 0; font-size: 12px; color: #999;">Share this OTP with the delivery partner upon delivery</p>
              </div>
              <p style="color: #666; font-size: 14px;">Please keep this OTP ready and share it only with the delivery partner when you receive your order.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">Thank you for ordering with FlashBites!</p>
            </div>`
          );
          console.log(`📧 Delivery OTP reminder sent to ${updatedOrder.userId.email}`);
        }
        
        // Send OTP reminder via SMS
        if (updatedOrder.userId.phone) {
          await sendDeliveryOtpSMS(
            updatedOrder.userId.phone,
            updatedOrder._id.toString(),
            updatedOrder.deliveryOtp
          );
          console.log(`📱 Delivery OTP SMS reminder sent to ${updatedOrder.userId.phone}`);
        }
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

    // Verify delivery OTP
    if (!otp) {
      return errorResponse(res, 400, 'Delivery OTP is required');
    }

    if (otp !== order.deliveryOtp) {
      console.log(`❌ Invalid OTP attempt: Expected ${order.deliveryOtp}, Got ${otp}`);
      return errorResponse(res, 400, 'Invalid delivery OTP. Please ask the customer for the correct OTP.');
    }

    console.log(`✅ OTP verified successfully for order ${orderId}`);

    // Mark as delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.paymentStatus = 'completed';
    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name address phone location')
      .populate('addressId');

    // Send SMS notification for delivered order
    try {
      if (updatedOrder.userId && updatedOrder.userId.phone) {
        await sendOrderDeliveredSMS(
          updatedOrder.userId.phone,
          updatedOrder._id.toString()
        );
        console.log(`📱 Order delivered SMS sent to ${updatedOrder.userId.phone}`);
      }
    } catch (smsError) {
      console.error('Failed to send delivery SMS:', smsError);
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

    if (!latitude || !longitude) {
      return errorResponse(res, 400, 'Latitude and longitude are required');
    }

    // Update user location
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'location.coordinates': [longitude, latitude],
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
        order.deliveryPartnerLocation = {
          type: 'Point',
          coordinates: [longitude, latitude],
          lastUpdated: new Date()
        };

        // Add to tracking history
        order.trackingHistory.push({
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          timestamp: new Date(),
          status: order.status
        });

        await order.save();

        // Emit real-time update via socket
        const io = req.app.get('io');
        if (io) {
          // Notify user tracking this order
          const locationUpdate = {
            orderId,
            location: { latitude, longitude },
            timestamp: new Date()
          };
          io.to(`order_${orderId}`).emit('delivery_location_update', locationUpdate);
          console.log(`📍 Broadcasting location update to order_${orderId}:`, { latitude, longitude });
        }
      }
    }

    return successResponse(res, 200, 'Location updated successfully', { latitude, longitude });
  } catch (error) {
    console.error('Update location error:', error);
    return errorResponse(res, 500, 'Failed to update location');
  }
};
