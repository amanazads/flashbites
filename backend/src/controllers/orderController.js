const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Address = require('../models/Address');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { 
  notifyOrderStatus, 
  notifyRestaurantNewOrder, 
  notifyUserOrderPlaced,
  notifyOrderReadyForPickup,
  notifyUserDeliveryAssigned,
  notifyPaymentReminder,
  notifyDeliveryPartnerNewOrder,
  notifyDeliveryPartnerAssignment,
  notifyDeliveryPartnerOrderReady,
  notifyDeliveryPartnerOrderCancelled
} = require('../utils/notificationService');
const { 
  notifyRestaurantNewOrder: socketNotifyRestaurant, 
  notifyAdminNewOrder, 
  notifyUserOrderUpdate,
  notifyDeliveryPartnersNewOrder,
  notifyDeliveryPartnerOrderAssigned,
  notifyDeliveryPartnerOrderCancelled: socketNotifyDeliveryPartnerCancelled
} = require('../services/socketService');
const { calculateDistance, calculateDeliveryCharge } = require('../utils/calculateDistance');

// Cancellation policy rules
const CANCELLATION_RULES = {
  pending: { allowed: true, fee: 0, message: 'Free cancellation' },
  confirmed: { 
    allowed: true, 
    fee: 0, 
    timeLimit: 60, // seconds
    message: 'Free cancellation within 60 seconds of confirmation' 
  },
  preparing: { 
    allowed: false, 
    fee: 100, 
    message: 'Order is being prepared and cannot be cancelled. Please contact restaurant.' 
  },
  ready: { 
    allowed: false, 
    fee: 100, 
    message: 'Order is ready and cannot be cancelled.' 
  },
  out_for_delivery: { 
    allowed: false, 
    fee: 100, 
    message: 'Order is out for delivery and cannot be cancelled.' 
  },
  delivered: { 
    allowed: false, 
    fee: 100, 
    message: 'Order is already delivered.' 
  }
};

// Check if order can be cancelled based on policy
const checkCancellationEligibility = (order) => {
  const status = order.status;
  const rule = CANCELLATION_RULES[status];

  if (!rule) {
    return { allowed: false, fee: 0, reason: 'Invalid order status' };
  }

  // If status doesn't allow cancellation at all
  if (!rule.allowed) {
    return { 
      allowed: false, 
      fee: rule.fee, 
      reason: rule.message 
    };
  }

  // For confirmed orders, check time window
  if (status === 'confirmed' && rule.timeLimit) {
    const confirmedAt = order.confirmedAt || order.updatedAt;
    const timeSinceConfirmation = (Date.now() - new Date(confirmedAt).getTime()) / 1000;

    if (timeSinceConfirmation > rule.timeLimit) {
      return {
        allowed: false,
        fee: 100,
        reason: `Cancellation window expired. Free cancellation is only available within ${rule.timeLimit} seconds of confirmation.`
      };
    }
  }

  // Calculate fee as percentage of order total
  const feePercentage = rule.fee;
  return {
    allowed: true,
    fee: (order.total * feePercentage) / 100,
    reason: rule.message
  };
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
exports.createOrder = async (req, res) => {
  try {
    console.log('===== CREATE ORDER DEBUG =====');
    console.log('User:', req.user?._id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { restaurantId, addressId, deliveryAddress, items, deliveryInstructions, couponCode, paymentMethod } = req.body;

    if (!restaurantId) {
      return errorResponse(res, 400, 'Restaurant ID is required');
    }

    if (!items || items.length === 0) {
      return errorResponse(res, 400, 'Order must contain at least one item');
    }

    if (!addressId && !deliveryAddress) {
      return errorResponse(res, 400, 'Delivery address is required');
    }

    // Verify restaurant exists and is active
    const restaurant = await Restaurant.findById(restaurantId);
    console.log('Restaurant found:', restaurant ? restaurant.name : 'NOT FOUND');
    
    if (!restaurant) {
      return errorResponse(res, 404, 'Restaurant not found');
    }
    
    if (!restaurant.isActive || !restaurant.isApproved) {
      return errorResponse(res, 400, 'Restaurant is not available');
    }

    if (!restaurant.acceptingOrders) {
      return errorResponse(res, 400, 'Restaurant is currently not accepting orders');
    }

    // Validate and calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      console.log('Processing item:', item.menuItemId);
      const menuItem = await MenuItem.findById(item.menuItemId);
      
      if (!menuItem) {
        return errorResponse(res, 404, `Menu item ${item.menuItemId} not found`);
      }
      
      if (!menuItem.isAvailable) {
        return errorResponse(res, 400, `${menuItem.name} is not available`);
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        image: menuItem.image
      });
    }

    // Validate minimum order value
    const MINIMUM_ORDER_VALUE = 199;
    if (subtotal < MINIMUM_ORDER_VALUE) {
      return errorResponse(res, 400, `Minimum order value is ₹${MINIMUM_ORDER_VALUE}`);
    }

    console.log('Order items processed:', orderItems.length);
    console.log('Subtotal:', subtotal);

    // Calculate distance-based delivery fee (platform-controlled)
    let deliveryFee = 30; // Default ₹30
    
    if (addressId) {
      const address = await Address.findById(addressId);
      if (address && address.location && address.location.coordinates && 
          restaurant.location && restaurant.location.coordinates) {
        const [addrLng, addrLat] = address.location.coordinates;
        const [restLng, restLat] = restaurant.location.coordinates;
        const distance = calculateDistance(restLat, restLng, addrLat, addrLng);
        deliveryFee = calculateDeliveryCharge(distance);
        console.log(`Distance: ${distance.toFixed(1)} km, Delivery Fee: ₹${deliveryFee}`);
      }
    }

    const tax = subtotal * 0.05; // 5% tax
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      
      if (coupon) {
        const now = new Date();
        if (now >= coupon.validFrom && now <= coupon.validTill) {
          if (subtotal >= coupon.minOrderValue) {
            if (coupon.discountType === 'percentage') {
              discount = (subtotal * coupon.discountValue) / 100;
              if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
              }
            } else {
              discount = coupon.discountValue;
            }
            
            // Update coupon usage
            coupon.usedCount += 1;
            await coupon.save();
          }
        }
      }
    }

    const total = subtotal + deliveryFee + tax - discount;
    console.log('Total calculated:', total);

    // Calculate estimated delivery time
    const estimatedDelivery = new Date();
    const deliveryMinutes = parseInt(restaurant.deliveryTime) || 30;
    estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + deliveryMinutes);

    // Create order
    const orderDoc = {
      userId: req.user._id,
      restaurantId,
      addressId: addressId || null,
      deliveryAddress: deliveryAddress || null,
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      discount,
      couponCode,
      total,
      paymentMethod: paymentMethod || 'cod',
      deliveryInstructions,
      estimatedDelivery
    };
    
    console.log('Creating order document:', JSON.stringify(orderDoc, null, 2));
    
    // Check if an identical order was just created (within last 5 seconds)
    const recentOrder = await Order.findOne({
      userId: req.user._id,
      restaurantId,
      total,
      createdAt: { $gte: new Date(Date.now() - 5000) } // Within last 5 seconds
    });

    if (recentOrder) {
      console.log('⚠️ DUPLICATE ORDER DETECTED - Returning existing order:', recentOrder._id);
      return successResponse(res, 201, 'Order created successfully', { order: recentOrder });
    }
    
    const order = await Order.create(orderDoc);
    console.log('Order created successfully:', order._id);

    // Set payment status based on payment method
    if (paymentMethod === 'cod') {
      // COD - payment pending until delivery
      order.paymentStatus = 'pending';
    } else if (paymentMethod === 'card' || paymentMethod === 'upi') {
      // Online payments - mark as pending until gateway confirms
      order.paymentStatus = 'pending';
      // NOTE: Restaurant should NOT process order until payment is confirmed
      console.log(`⚠️ PAYMENT PENDING: Order ${order._id} requires payment confirmation`);
      console.log(`⚠️ Payment method: ${paymentMethod} - Gateway integration required`);
    }
    await order.save();

    // Populate order details for notifications
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name phone address')
      .populate('items.menuItemId', 'name price');

    // Send real-time notifications with sound
    try {
      console.log(`📧 Notification: New order ${order._id} for restaurant ${restaurant.name}`);
      console.log(`📧 Order details: ${orderItems.length} items, Total: ${total}`);
      console.log(`💳 Payment method: ${paymentMethod}`);
      
      // Socket notification to restaurant
      socketNotifyRestaurant(restaurantId, populatedOrder);
      
      // Socket notification to all admins
      notifyAdminNewOrder(populatedOrder);
      
      // Database + Push notification to restaurant owner
      await notifyRestaurantNewOrder(populatedOrder, restaurant.ownerId);
      
      // Database + Push notification to user
      await notifyUserOrderPlaced(populatedOrder);
      
      if (paymentMethod !== 'cod') {
        console.log(`⚠️ WARNING: Online payment not confirmed yet!`);
      }
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
    }

    successResponse(res, 201, 'Order created successfully', { order: populatedOrder });
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error);
    errorResponse(res, 500, 'Failed to create order', error.message);
  }
};

// @desc    Get user orders
// @route   GET /api/orders/my-orders
// @access  Private (User)
exports.getUserOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { userId: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('restaurantId', 'name image rating')
      .populate('addressId')
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

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('restaurantId', 'name phone address image')
      .populate('addressId');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    // Check authorization
    if (
      order.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'restaurant_owner'
    ) {
      return errorResponse(res, 403, 'Not authorized to view this order');
    }

    successResponse(res, 200, 'Order retrieved successfully', { order });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get order', error.message);
  }
};

// @desc    Get live tracking for order
// @route   GET /api/orders/:id/tracking
// @access  Private (User/Restaurant/Admin/Delivery Partner)
exports.getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name phone address location')
      .populate('deliveryPartnerId', 'name phone')
      .populate('addressId')
      .select('status deliveryPartnerLocation trackingHistory deliveryAddress restaurantId userId deliveryPartnerId estimatedDelivery');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    // Check authorization
    const userId = req.user._id.toString();
    const isAuthorized = 
      order.userId._id.toString() === userId ||
      order.deliveryPartnerId?._id.toString() === userId ||
      req.user.role === 'admin' ||
      (req.user.role === 'restaurant_owner' && order.restaurantId._id.toString() === userId);

    if (!isAuthorized) {
      return errorResponse(res, 403, 'Not authorized to track this order');
    }

    const trackingData = {
      orderId: order._id,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      restaurant: {
        name: order.restaurantId.name,
        address: order.restaurantId.address,
        location: order.restaurantId.location
      },
      deliveryAddress: order.deliveryAddress || order.addressId,
      deliveryPartner: order.deliveryPartnerId ? {
        name: order.deliveryPartnerId.name,
        phone: order.deliveryPartnerId.phone
      } : null,
      currentLocation: order.deliveryPartnerLocation && order.deliveryPartnerLocation.coordinates[0] !== 0 ? {
        latitude: order.deliveryPartnerLocation.coordinates[1],
        longitude: order.deliveryPartnerLocation.coordinates[0],
        lastUpdated: order.deliveryPartnerLocation.lastUpdated
      } : null,
      trackingHistory: order.trackingHistory.map(point => ({
        latitude: point.location.coordinates[1],
        longitude: point.location.coordinates[0],
        timestamp: point.timestamp,
        status: point.status
      }))
    };

    successResponse(res, 200, 'Tracking data retrieved successfully', trackingData);
  } catch (error) {
    console.error('Get tracking error:', error);
    errorResponse(res, 500, 'Failed to get tracking data', error.message);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Restaurant Owner/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    console.log('🔄 [updateOrderStatus] Start - OrderID:', req.params.id, 'Status:', req.body.status);
    
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      console.log('❌ [updateOrderStatus] Invalid status:', status);
      return errorResponse(res, 400, 'Invalid order status');
    }

    console.log('✓ [updateOrderStatus] Finding order...');
    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log('❌ [updateOrderStatus] Order not found');
      return errorResponse(res, 404, 'Order not found');
    }

    console.log('✓ [updateOrderStatus] Order found, updating status to:', status);
    
    // Update status
    order.status = status;

    if (status === 'confirmed') {
      console.log('✓ [updateOrderStatus] Marking as confirmed...');
      order.confirmedAt = new Date();
    }

    if (status === 'delivered') {
      console.log('✓ [updateOrderStatus] Marking as delivered...');
      order.deliveredAt = new Date();
      
      // Update restaurant earnings
      const restaurant = await Restaurant.findById(order.restaurantId);
      const commission = (order.total * restaurant.commissionRate) / 100;
      const restaurantEarning = order.total - commission;
      
      restaurant.totalEarnings += restaurantEarning;
      await restaurant.save();
      console.log('✓ [updateOrderStatus] Restaurant earnings updated');
    }

    if (status === 'cancelled') {
      console.log('✓ [updateOrderStatus] Marking as cancelled...');
      order.cancelledAt = new Date();
      order.cancellationReason = req.body.reason || 'Cancelled by restaurant';
    }

    console.log('✓ [updateOrderStatus] Saving order...');
    await order.save();

    // Populate order details for notifications
    console.log('✓ [updateOrderStatus] Populating order data...');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate({
        path: 'restaurantId',
        select: 'name phone address ownerId',
        populate: { path: 'ownerId', select: '_id name email' }
      })
      .populate('items.menuItemId', 'name price');

    console.log('✓ [updateOrderStatus] Order populated successfully');

    // Send notification for status update
    const statusMap = {
      confirmed: 'confirmed',
      preparing: 'preparing',
      ready: 'ready',
      out_for_delivery: 'picked_up',
      delivered: 'delivered',
      cancelled: 'cancelled'
    };
    
    if (statusMap[status]) {
      console.log('✓ [updateOrderStatus] Sending notifications...');
      try {
        // Use populatedOrder for both notifications
        await notifyOrderStatus(populatedOrder, statusMap[status]);
        console.log('✓ [updateOrderStatus] Email notification sent');
        
        // Send real-time notification to user with sound
        if (populatedOrder.userId) {
          const userIdStr = populatedOrder.userId._id ? populatedOrder.userId._id.toString() : populatedOrder.userId.toString();
          notifyUserOrderUpdate(userIdStr, populatedOrder);
          console.log('✓ [updateOrderStatus] Socket notification sent to user:', userIdStr);
        }
        
        // Additional specific notifications
        if (status === 'confirmed' || status === 'ready') {
          // Notify all delivery partners about new order available
          try {
            const orderData = await notifyDeliveryPartnerNewOrder(populatedOrder);
            if (orderData) {
              // Send socket notification to all delivery partners
              notifyDeliveryPartnersNewOrder(populatedOrder);
            }
          } catch (dpError) {
            console.error('Error notifying delivery partners:', dpError);
          }
        }
        
        if (status === 'ready') {
          // Notify delivery partner if already assigned
          if (populatedOrder.deliveryPartnerId) {
            await notifyDeliveryPartnerOrderReady(populatedOrder, populatedOrder.deliveryPartnerId);
          }
        }
        
        if (status === 'out_for_delivery' && populatedOrder.paymentMethod === 'cod') {
          // Send payment reminder for COD orders
          await notifyPaymentReminder(populatedOrder);
        }
        
        // Also notify restaurant about the status change
        if (populatedOrder.restaurantId && ['confirmed', 'ready', 'delivered', 'cancelled'].includes(status)) {
          const restaurantIdStr = populatedOrder.restaurantId._id ? populatedOrder.restaurantId._id.toString() : populatedOrder.restaurantId.toString();
          socketNotifyRestaurant(restaurantIdStr, {
            ...populatedOrder.toObject(),
            message: `Order #${populatedOrder._id.toString().slice(-8)} status: ${status}`,
            type: 'ORDER_STATUS_UPDATE'
          });
          console.log('✓ [updateOrderStatus] Restaurant notified of status change');
        }
      } catch (notifError) {
        console.error('⚠️ [updateOrderStatus] Notification error (non-fatal):', notifError.message);
        console.error(notifError.stack);
        // Don't fail the request if notifications fail
      }
    }

    console.log('✅ [updateOrderStatus] Success - Sending response');
    successResponse(res, 200, 'Order status updated successfully', { order: populatedOrder });
  } catch (error) {
    console.error('❌ [updateOrderStatus] Fatal error:', error.message);
    console.error(error.stack);
    errorResponse(res, 500, 'Failed to update order status', error.message);
  }
};

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private (User)
exports.cancelOrder = async (req, res) => {
  try {
    console.log('🚫 [cancelOrder] Start - OrderID:', req.params.id);
    
    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log('❌ [cancelOrder] Order not found');
      return errorResponse(res, 404, 'Order not found');
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      console.log('❌ [cancelOrder] Unauthorized access attempt');
      return errorResponse(res, 403, 'Not authorized');
    }

    // Check cancellation eligibility based on status and time
    const cancellationCheck = checkCancellationEligibility(order);
    
    if (!cancellationCheck.allowed) {
      console.log('❌ [cancelOrder] Cancellation not allowed:', cancellationCheck.reason);
      return errorResponse(res, 400, cancellationCheck.reason, { 
        canCancel: false,
        fee: cancellationCheck.fee
      });
    }

    console.log('✓ [cancelOrder] Cancellation allowed, fee:', cancellationCheck.fee);

    // Calculate refund amount
    const cancellationFee = cancellationCheck.fee;
    const refundAmount = order.total - cancellationFee;

    // Update order
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by user';
    order.cancellationFee = cancellationFee;
    order.refundAmount = refundAmount;
    
    // Update payment status for refund
    if (order.paymentStatus === 'completed' && refundAmount > 0) {
      order.paymentStatus = 'refunded';
    }
    
    await order.save();
    console.log('✓ [cancelOrder] Order updated, refund amount:', refundAmount);

    // Populate order for notifications
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate({
        path: 'restaurantId',
        select: 'name phone address ownerId',
        populate: { path: 'ownerId', select: '_id name email' }
      })
      .populate('items.menuItemId', 'name price');

    // Send notifications
    try {
      console.log('✓ [cancelOrder] Sending cancellation notifications...');
      
      // Notify via email service
      await notifyOrderStatus(populatedOrder, 'cancelled');
      
      // Send real-time notification to user
      if (populatedOrder.userId) {
        const userIdStr = populatedOrder.userId._id ? populatedOrder.userId._id.toString() : populatedOrder.userId.toString();
        notifyUserOrderUpdate(userIdStr, populatedOrder);
        console.log('✓ [cancelOrder] User notified');
      }
      
      // Notify restaurant about cancellation
      if (populatedOrder.restaurantId) {
        const restaurantIdStr = populatedOrder.restaurantId._id ? populatedOrder.restaurantId._id.toString() : populatedOrder.restaurantId.toString();
        notifyRestaurantNewOrder(restaurantIdStr, {
          ...populatedOrder.toObject(),
          message: `Order #${populatedOrder._id.toString().slice(-8)} was cancelled by customer`,
          type: 'ORDER_CANCELLED'
        });
        console.log('✓ [cancelOrder] Restaurant notified');
      }
    } catch (notifError) {
      console.error('⚠️ [cancelOrder] Notification error (non-fatal):', notifError.message);
    }

    successResponse(res, 200, 'Order cancelled successfully', { order: populatedOrder });
  } catch (error) {
    errorResponse(res, 500, 'Failed to cancel order', error.message);
  }
};

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant/:restaurantId
// @access  Private (Restaurant Owner)
exports.getRestaurantOrders = async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = { restaurantId: req.params.restaurantId };

    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(query)
      .populate('userId', 'name phone')
      .populate('addressId')
      .sort('-createdAt');

    successResponse(res, 200, 'Orders retrieved successfully', {
      count: orders.length,
      orders
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get orders', error.message);
  }
};