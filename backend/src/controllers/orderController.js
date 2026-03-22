const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Address = require('../models/Address');
const PlatformSettings = require('../models/PlatformSettings');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { sendOrderCancelledEmail } = require('../utils/emailService');
const axios = require('axios');
const Razorpay = require('razorpay');
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
const { calculateDistance, calculateDeliveryCharge, DEFAULT_DELIVERY_CHARGES } = require('../utils/calculateDistance');

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

const INDIA_BOUNDS = {
  latMin: 6,
  latMax: 38,
  lngMin: 68,
  lngMax: 98
};

const isInIndia = (lat, lng) => (
  lat >= INDIA_BOUNDS.latMin &&
  lat <= INDIA_BOUNDS.latMax &&
  lng >= INDIA_BOUNDS.lngMin &&
  lng <= INDIA_BOUNDS.lngMax
);

const normalizeCoordPair = (first, second) => {
  const lng = Number(first);
  const lat = Number(second);
  const altLng = Number(second);
  const altLat = Number(first);

  const valid1 = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const valid2 = Number.isFinite(altLat) && Number.isFinite(altLng) && altLat >= -90 && altLat <= 90 && altLng >= -180 && altLng <= 180;

  if (valid1 && valid2) {
    const inIndia1 = isInIndia(lat, lng);
    const inIndia2 = isInIndia(altLat, altLng);
    if (inIndia1 && !inIndia2) return [lng, lat];
    if (!inIndia1 && inIndia2) return [altLng, altLat];
    return [lng, lat];
  }

  if (valid1) return [lng, lat];
  if (valid2) return [altLng, altLat];
  return null;
};

const geocodeAddressFromFields = async ({ street, city, state, zipCode, name }) => {
  const parts = [street, city, state, zipCode, name, 'India'].filter(Boolean);
  if (parts.length < 2 && !city && !name) return null;

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      timeout: 7000,
      headers: {
        'User-Agent': 'FlashBites/1.0 (support@flashbites.in)'
      },
      params: {
        q: parts.length ? parts.join(', ') : (city ? `${city}, India` : `${name}, India`),
        format: 'json',
        limit: 1
      }
    });

    const first = response?.data?.[0];
    if (first && first.lat && first.lon) {
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const normalized = normalizeCoordPair(lng, lat);
        return normalized && isInIndia(normalized[1], normalized[0]) ? normalized : null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const getAddressCoordinates = (addressLike) => {
  if (!addressLike) return null;

  if (Array.isArray(addressLike.coordinates) && addressLike.coordinates.length >= 2) {
    const normalized = normalizeCoordPair(addressLike.coordinates[0], addressLike.coordinates[1]);
    if (normalized) return normalized;
  }

  if (addressLike.coordinates && Array.isArray(addressLike.coordinates.coordinates)) {
    const normalized = normalizeCoordPair(addressLike.coordinates.coordinates[0], addressLike.coordinates.coordinates[1]);
    if (normalized) return normalized;
  }

  if (addressLike.latitude != null && addressLike.longitude != null) {
    const normalized = normalizeCoordPair(addressLike.longitude, addressLike.latitude);
    if (normalized) return normalized;
  }

  if (addressLike.lat != null && addressLike.lng != null) {
    const normalized = normalizeCoordPair(addressLike.lng, addressLike.lat);
    if (normalized) return normalized;
  }

  if (addressLike.location && Array.isArray(addressLike.location.coordinates) && addressLike.location.coordinates.length >= 2) {
    const normalized = normalizeCoordPair(addressLike.location.coordinates[0], addressLike.location.coordinates[1]);
    if (normalized) return normalized;
  }

  if (addressLike.location && addressLike.location.lat != null && addressLike.location.lng != null) {
    const normalized = normalizeCoordPair(addressLike.location.lng, addressLike.location.lat);
    if (normalized) return normalized;
  }

  if (addressLike.lat != null && addressLike.lng != null) {
    const normalized = normalizeCoordPair(addressLike.lng, addressLike.lat);
    if (normalized) return normalized;
  }

  if (addressLike.latitude != null && addressLike.longitude != null) {
    const normalized = normalizeCoordPair(addressLike.longitude, addressLike.latitude);
    if (normalized) return normalized;
  }

  return null;
};

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
    const restaurant = await Restaurant.findById(restaurantId)
      .select('name ownerId isActive isApproved acceptingOrders location deliveryTime deliveryRadiusKm address')
      .lean();
    
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

    const menuItemIds = items.map((item) => item.menuItemId);
    const uniqueMenuItemIds = [...new Set(menuItemIds.map((id) => String(id)))];

    const menuItems = await MenuItem.find({
      _id: { $in: uniqueMenuItemIds },
      restaurantId,
    })
      .select('_id name price image isAvailable variants')
      .lean();

    const menuItemMap = new Map(menuItems.map((menuItem) => [String(menuItem._id), menuItem]));

    for (const item of items) {
      const menuItem = menuItemMap.get(String(item.menuItemId));

      if (!menuItem) {
        return errorResponse(res, 404, `Menu item ${item.menuItemId} not found`);
      }

      if (!menuItem.isAvailable) {
        return errorResponse(res, 400, `${menuItem.name} is not available`);
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return errorResponse(res, 400, `Invalid quantity for ${menuItem.name}`);
      }

      let itemPrice = menuItem.price;
      let itemName = menuItem.name;
      
      if (item.variantName && menuItem.variants && menuItem.variants.length > 0) {
        const variant = menuItem.variants.find(v => v.name === item.variantName);
        if (variant) {
          itemPrice = variant.price;
          itemName = `${menuItem.name} (${variant.name})`;
        }
      }

      const itemTotal = itemPrice * quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        name: itemName,
        quantity,
        price: itemPrice,
        image: menuItem.image
      });
    }



    // Calculate distance-based delivery fee (platform-controlled)
    let deliveryFee = 0;
    let restaurantCoords = getAddressCoordinates(restaurant.location ? { coordinates: restaurant.location.coordinates } : null);

    if (!restaurantCoords || !isInIndia(restaurantCoords[1], restaurantCoords[0])) {
      const geocodedRestaurant = await geocodeAddressFromFields({
        ...restaurant.address,
        name: restaurant.name
      });
      if (geocodedRestaurant) {
        restaurantCoords = geocodedRestaurant;
        await Restaurant.findByIdAndUpdate(restaurantId, {
          $set: {
            location: {
              type: 'Point',
              coordinates: geocodedRestaurant
            }
          }
        });
      }
    }

    if (!restaurantCoords || !isInIndia(restaurantCoords[1], restaurantCoords[0])) {
      return errorResponse(res, 400, 'Restaurant location is not configured properly');
    }

    let selectedAddressDoc = null;
    let deliveryCoords = null;

    if (addressId) {
      selectedAddressDoc = await Address.findOne({ _id: addressId, userId: req.user._id });
      if (!selectedAddressDoc) {
        return errorResponse(res, 404, 'Delivery address not found');
      }

      deliveryCoords = getAddressCoordinates(selectedAddressDoc);
      if (!deliveryCoords || !isInIndia(deliveryCoords[1], deliveryCoords[0])) {
        const geocoded = await geocodeAddressFromFields(selectedAddressDoc);
        if (geocoded) {
          deliveryCoords = geocoded;
          await Address.findByIdAndUpdate(selectedAddressDoc._id, { $set: { coordinates: geocoded } });
        }
      }
    } else if (deliveryAddress) {
      deliveryCoords = getAddressCoordinates(deliveryAddress);
      if (!deliveryCoords || !isInIndia(deliveryCoords[1], deliveryCoords[0])) {
        const geocoded = await geocodeAddressFromFields(deliveryAddress);
        if (geocoded) deliveryCoords = geocoded;
      }
      if (!deliveryCoords) {
        return errorResponse(res, 400, 'Delivery address location is required. Please use a verified address.');
      }
    }

    if (!deliveryCoords) {
      return errorResponse(res, 400, 'Unable to verify delivery address location. Please update your address.');
    }

    const [addrLng, addrLat] = deliveryCoords;
    const [restLng, restLat] = restaurantCoords;
    const distance = calculateDistance(restLat, restLng, addrLat, addrLng);
    const maxDistanceKm = Number(restaurant.deliveryRadiusKm || process.env.MAX_DELIVERY_DISTANCE_KM || 20);

    if (!Number.isFinite(distance)) {
      return errorResponse(res, 400, 'Unable to calculate delivery distance for the selected address');
    }

    if (distance > maxDistanceKm) {
      if (process.env.NODE_ENV !== 'production') {
        const debugData = {
          distanceKm: Number(distance.toFixed(2)),
          maxDistanceKm,
          restaurantCoords,
          deliveryCoords,
          restaurantId,
          addressId
        };
        console.warn('Delivery distance check failed', debugData);
        return errorResponse(
          res,
          400,
          `Delivery not available (distance ${distance.toFixed(2)}km > ${maxDistanceKm}km). Please update your address.`,
          debugData
        );
      }
      return errorResponse(res, 400, 'Delivery is not available in your area. Maximum delivery distance is 20km.');
    }

    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      
      if (coupon) {
        const now = new Date();
        const isValidWindow = now >= coupon.validFrom && now <= coupon.validTill;
        const meetsMinOrder = subtotal >= coupon.minOrderValue;
        const underUsageLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
        const matchesRestaurant = !coupon.applicableRestaurants?.length
          || coupon.applicableRestaurants.some((id) => id.toString() === restaurantId.toString());
        const matchesUser = !coupon.userSpecific
          || coupon.applicableUsers?.some((id) => id.toString() === req.user._id.toString());

        if (isValidWindow && meetsMinOrder && underUsageLimit && matchesRestaurant && matchesUser) {
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

    let settings = await PlatformSettings.findOne().lean();
    if (!settings) {
      settings = { platformFee: 25, taxRate: 0.05, deliveryChargeRules: DEFAULT_DELIVERY_CHARGES };
    }

    deliveryFee = calculateDeliveryCharge(distance, settings.deliveryChargeRules);
    const platformFee = Number(settings.platformFee || 0);
    const taxRate = Number(settings.taxRate || 0);
    const taxBase = subtotal - discount;
    const tax = taxBase > 0 ? taxBase * taxRate : 0;

    const total = subtotal + deliveryFee + platformFee + tax - discount;
    // Calculate estimated delivery time
    const estimatedDelivery = new Date();
    const deliveryMinutes = parseInt(restaurant.deliveryTime) || 30;
    estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + deliveryMinutes);

    // Create order
    const orderDoc = {
      userId: req.user._id,
      restaurantId,
      addressId: addressId || null,
      deliveryAddress: deliveryAddress
        ? { ...deliveryAddress, coordinates: deliveryCoords }
        : selectedAddressDoc
        ? {
            street: selectedAddressDoc.street,
            city: selectedAddressDoc.city,
            state: selectedAddressDoc.state,
            zipCode: selectedAddressDoc.zipCode,
            coordinates: deliveryCoords
          }
        : null,
      items: orderItems,
      subtotal,
      deliveryFee,
      platformFee,
      tax,
      discount,
      couponCode,
      total,
      paymentMethod: paymentMethod || 'cod',
      deliveryInstructions,
      estimatedDelivery
    };
    
    // Check if an identical order was just created (within last 5 seconds)
    const recentOrder = await Order.findOne({
      userId: req.user._id,
      restaurantId,
      total,
      createdAt: { $gte: new Date(Date.now() - 5000) } // Within last 5 seconds
    });

    if (recentOrder) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ DUPLICATE ORDER DETECTED - Returning existing order:', recentOrder._id);
      }
      return successResponse(res, 201, 'Order created successfully', { order: recentOrder });
    }

    const order = await Order.create(orderDoc);

    if (paymentMethod === 'card' || paymentMethod === 'upi') {
      // NOTE: Restaurant should NOT process order until payment is confirmed
      if (process.env.NODE_ENV !== 'production') {
        console.log(`⚠️ PAYMENT PENDING: Order ${order._id} requires payment confirmation`);
        console.log(`⚠️ Payment method: ${paymentMethod} - Gateway integration required`);
      }
    }

    // Populate order details for notifications
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name phone address')
      .populate('items.menuItemId', 'name price');

    // Send real-time notifications with sound
    try {
      // Socket notification to restaurant
      socketNotifyRestaurant(restaurantId, populatedOrder);
      
      // Socket notification to all admins
      notifyAdminNewOrder(populatedOrder);
      
      // Database + Push notification to restaurant owner
      await notifyRestaurantNewOrder(populatedOrder, restaurant.ownerId);
      
      // Database + Push notification to user
      await notifyUserOrderPlaced(populatedOrder);

      if (paymentMethod !== 'cod' && process.env.NODE_ENV !== 'production') {
        console.log(`⚠️ WARNING: Online payment not confirmed yet!`);
      }
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
    }

    successResponse(res, 201, 'Order created successfully', { order: populatedOrder });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('CREATE ORDER ERROR:', error);
    }
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
      .populate('addressId')
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

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && order.userId.toString() !== req.user._id.toString()) {
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
    order.cancellationReason = req.body.reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by user');
    order.cancellationFee = cancellationFee;
    order.refundAmount = refundAmount;
    
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

      if (populatedOrder.userId?.email) {
        await sendOrderCancelledEmail({
          email: populatedOrder.userId.email,
          name: populatedOrder.userId.name,
          orderRef: populatedOrder.orderNumber || populatedOrder._id.toString().slice(-8),
          restaurantName: populatedOrder.restaurantId?.name,
          total: populatedOrder.total || 0,
          refundAmount: refundAmount > 0 ? refundAmount : 0,
          paymentMethod: populatedOrder.paymentMethod,
          cancellationReason: populatedOrder.cancellationReason
        });
      }
      
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

    // Initiate refund for non-COD orders after email notification
    if (order.paymentMethod !== 'cod' && refundAmount > 0 && order.paymentStatus === 'completed') {
      try {
        const payment = await Payment.findOne({ orderId: order._id, status: 'success' }).sort('-createdAt');
        if (payment) {
          let refunded = false;

          if (payment.gateway === 'razorpay' && razorpay) {
            const razorpayPaymentId = payment.gatewayResponse?.razorpay_payment_id;
            if (razorpayPaymentId) {
              await razorpay.payments.refund(razorpayPaymentId, {
                amount: Math.round(refundAmount * 100)
              });
              refunded = true;
            }
          }

          if (payment.gateway === 'stripe' && stripe && payment.transactionId) {
            await stripe.refunds.create({
              payment_intent: payment.transactionId,
              amount: Math.round(refundAmount * 100)
            });
            refunded = true;
          }

          if (refunded) {
            payment.status = 'refunded';
            payment.refundAmount = refundAmount;
            payment.refundReason = order.cancellationReason || 'Order cancelled';
            payment.refundedAt = new Date();
            await payment.save();

            order.paymentStatus = 'refunded';
            await order.save();
          }
        }
      } catch (refundError) {
        console.error('⚠️ [cancelOrder] Refund failed:', refundError.message);
      }
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