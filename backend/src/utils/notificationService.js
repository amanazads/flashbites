const webpush = require('web-push');
const axios = require('axios');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const { admin } = require('../config/firebaseAdmin');
const { cacheGet, cacheSet } = require('./memoryCache');

const WEB_PUSH_ENABLED = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
const SMS_ENABLED = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
const NOTIFICATION_DEDUPE_TTL_MS = 15000;

const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone) return null;
  const raw = String(rawPhone).trim();
  if (!raw) return null;

  if (raw.startsWith('+') && raw.length >= 8) {
    return raw;
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
};

const sendSms = async (phone, body) => {
  try {
    if (!SMS_ENABLED) return false;

    const to = normalizePhoneNumber(phone);
    if (!to || !body) return false;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const payload = new URLSearchParams({
      To: to,
      From: process.env.TWILIO_PHONE_NUMBER,
      Body: String(body).slice(0, 1550)
    });

    await axios.post(url, payload, {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    return true;
  } catch (error) {
    console.error('SMS send failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const notifyPhonesViaSms = async (phones = [], message = '') => {
  const uniquePhones = [...new Set((phones || []).map((phone) => normalizePhoneNumber(phone)).filter(Boolean))];
  if (!uniquePhones.length || !message) return;

  await Promise.allSettled(uniquePhones.map((phone) => sendSms(phone, message)));
};

const sendOrderStatusSms = async (order, status, orderRef) => {
  if (!SMS_ENABLED || !order) return;

  const userPhone = order.userId?.phone;
  const restaurantPhone = order.restaurantId?.phone;
  const ownerId = order.restaurantId?.ownerId?._id || order.restaurantId?.ownerId || null;

  let ownerPhone = order.restaurantId?.ownerId?.phone || null;
  if (!ownerPhone && ownerId) {
    const owner = await User.findById(ownerId).select('phone').lean();
    ownerPhone = owner?.phone || null;
  }

  const admins = await User.find({ role: 'admin', isActive: true }).select('phone').lean();
  const adminPhones = admins.map((admin) => admin.phone).filter(Boolean);

  const userMessages = {
    placed: `FlashBites: Your order #${orderRef} has been placed successfully.`,
    confirmed: `FlashBites: Your order #${orderRef} has been confirmed by ${order.restaurantId?.name || 'restaurant'}.`,
    delivered: `FlashBites: Your order #${orderRef} has been delivered successfully. Thank you!`,
    cancelled: `FlashBites: Your order #${orderRef} has been cancelled. Reason: ${order.cancellationReason || 'Not specified'}.`
  };

  const restaurantMessages = {
    cancelled: `FlashBites: Order #${orderRef} has been cancelled. Customer: ${order.userId?.name || 'N/A'}, Amount: Rs ${order.total || 0}.`
  };

  const adminMessages = {
    cancelled: `FlashBites Admin Alert: Order #${orderRef} cancelled. Restaurant: ${order.restaurantId?.name || 'N/A'}, Customer: ${order.userId?.name || 'N/A'}.`
  };

  if (status === 'placed' || status === 'confirmed' || status === 'delivered') {
    await notifyPhonesViaSms([userPhone], userMessages[status]);
    return;
  }

  if (status === 'cancelled') {
    await Promise.allSettled([
      notifyPhonesViaSms([userPhone], userMessages.cancelled),
      notifyPhonesViaSms([restaurantPhone, ownerPhone], restaurantMessages.cancelled),
      notifyPhonesViaSms(adminPhones, adminMessages.cancelled)
    ]);
  }
};

// Configure web-push with VAPID keys
if (WEB_PUSH_ENABLED) {
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_USER || 'noreply@flashbites.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
}

// Create notification in database
const createNotification = async (recipientId, notificationData) => {
  try {
    if (!recipientId || !notificationData?.title || !notificationData?.message) {
      return null;
    }

    const notification = await Notification.create({
      recipient: recipientId,
      ...notificationData
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Send push notification
const sendPushNotification = async (userId, payload) => {
  try {
    if (!WEB_PUSH_ENABLED || !userId) {
      return;
    }

    const subscriptions = await PushSubscription.find({
      user: userId,
      isActive: true
    }).select('endpoint keys deviceType');

    if (subscriptions.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`);
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: '/logo.png',
      badge: '/logo.png',
      data: payload.data || {},
      tag: payload.type || 'general_notification',
      requireInteraction: payload.priority === 'high'
    });

    const promises = subscriptions.map(async (subscription) => {
      try {
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
          await PushSubscription.updateOne({ _id: subscription._id }, { $set: { isActive: false } });
          return;
        }

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          pushPayload
        );
        console.log(`✅ Push sent to ${subscription.deviceType} for user ${userId}`);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or invalid
          await PushSubscription.updateOne({ _id: subscription._id }, { $set: { isActive: false } });
          console.log(`Deactivated expired subscription for user ${userId}`);
        } else {
          console.error(`Error sending push to user ${userId}:`, error.message);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
};

// Send FCM/APNS notification using saved token (for native lockscreen + tray delivery)
const sendFcmNotification = async (userId, payload) => {
  try {
    if (!userId || !admin?.apps?.length) {
      return;
    }

    const user = await User.findById(userId).select('fcmToken').lean();
    const token = typeof user?.fcmToken === 'string' ? user.fcmToken.trim() : '';
    if (!token) return;

    const rawData = payload?.data || {};
    const data = Object.keys(rawData).reduce((acc, key) => {
      const value = rawData[key];
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {});

    const message = {
      token,
      notification: {
        title: payload.title || 'FlashBites',
        body: payload.message || 'You have a new update'
      },
      data: {
        ...data,
        type: String(payload.type || 'general_notification'),
        priority: String(payload.priority || 'high')
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'flashbites-orders',
          sound: 'default',
          defaultSound: true,
          visibility: 'PUBLIC',
          notificationPriority: 'PRIORITY_HIGH'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };

    await admin.messaging().send(message);
    console.log(`✅ FCM push sent for user ${userId}`);
  } catch (error) {
    const code = error?.code || '';
    if (
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-argument') ||
      code.includes('invalid-registration-token') ||
      code.includes('messaging/invalid-registration-token') ||
      code.includes('messaging/registration-token-not-registered')
    ) {
      await User.findByIdAndUpdate(userId, { $set: { fcmToken: null } });
      console.log(`Removed invalid FCM token for user ${userId}`);
      return;
    }

    console.error(`Error sending FCM push to user ${userId}:`, error.message || error);
  }
};

// Combined: Create notification + send push
const notifyUser = async (userId, notificationData) => {
  try {
    if (!userId || !notificationData?.title || !notificationData?.message) {
      return null;
    }

    const fingerprintSource = [
      String(userId),
      String(notificationData.type || 'general_notification'),
      String(notificationData.data?.orderId || ''),
      String(notificationData.data?.couponId || ''),
      String(notificationData.message || ''),
    ].join(':');
    const dedupeKey = `notify:${fingerprintSource}`;
    if (cacheGet(dedupeKey)) {
      return null;
    }
    cacheSet(dedupeKey, true, NOTIFICATION_DEDUPE_TTL_MS);

    // Save to database
    const notification = await createNotification(userId, notificationData);

    // Send both web-push and FCM/APNS notifications.
    await Promise.allSettled([
      sendPushNotification(userId, notificationData),
      sendFcmNotification(userId, notificationData)
    ]);

    return notification;
  } catch (error) {
    console.error('Error in notifyUser:', error);
    return null;
  }
};

// Notify multiple users
const notifyMultipleUsers = async (userIds, notificationData) => {
  try {
    const uniqueUserIds = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
    const promises = uniqueUserIds.map((userId) => notifyUser(userId, notificationData));
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Notified ${successful}/${uniqueUserIds.length} users`);
    return results;
  } catch (error) {
    console.error('Error in notifyMultipleUsers:', error);
    return [];
  }
};

// Order status change notifications
const notifyOrderStatus = async (order, status) => {
  try {
    console.log('📧 [notifyOrderStatus] Start - Status:', status, 'OrderID:', order._id);
    
    // Use _id as fallback for orderNumber if it's undefined
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    const messages = {
      confirmed: {
        title: '✅ Order Confirmed',
        message: `Your order #${orderRef} has been confirmed by ${order.restaurantId?.name || 'the restaurant'}`,
        type: 'order_confirmed'
      },
      preparing: {
        title: '👨‍🍳 Preparing Your Order',
        message: `Your order #${orderRef} is being prepared`,
        type: 'order_preparing'
      },
      ready: {
        title: '✨ Order Ready',
        message: `Your order #${orderRef} is ready for pickup`,
        type: 'order_ready'
      },
      out_for_delivery: {
        title: '🚴 Out for Delivery',
        message: `Your order #${orderRef} is on the way`,
        type: 'order_out_for_delivery'
      },
      picked_up: {
        title: '🚴 On the Way',
        message: `Your order #${orderRef} has been picked up and is on the way`,
        type: 'order_picked_up'
      },
      delivered: {
        title: '🎉 Order Delivered',
        message: `Your order #${orderRef} has been delivered. Enjoy your meal!`,
        type: 'order_delivered'
      },
      cancelled: {
        title: '❌ Order Cancelled',
        message: `Your order #${orderRef} has been cancelled`,
        type: 'order_cancelled',
        priority: 'high'
      }
    };

    const notificationData = messages[status];
    if (!notificationData) {
      console.log('⚠️ [notifyOrderStatus] No message template for status:', status);
      return;
    }

    notificationData.data = {
      orderId: order._id,
      orderNumber: orderRef,
      restaurantId: order.restaurantId?._id,
      status
    };

    // Notify customer (use userId instead of user)
    if (order.userId) {
      console.log('✓ [notifyOrderStatus] Notifying customer:', order.userId._id || order.userId);
      await notifyUser(order.userId._id || order.userId, notificationData);
    }

    await sendOrderStatusSms(order, status, orderRef);

    // Notify restaurant owner if new order
    if (status === 'confirmed' && order.restaurantId?.ownerId) {
      console.log('✓ [notifyOrderStatus] Notifying restaurant owner');
      await notifyUser(order.restaurantId.ownerId, {
        title: '🔔 New Order Received',
        message: `New order #${orderRef} - ₹${order.total || order.totalAmount}`,
        type: 'order_placed',
        priority: 'high',
        data: {
          orderId: order._id,
          orderNumber: orderRef
        }
      });
    }
    
    console.log('✅ [notifyOrderStatus] Complete');
  } catch (error) {
    console.error('❌ [notifyOrderStatus] Error:', error.message);
    console.error(error.stack);
    // Don't throw - let the request continue even if notification fails
  }
};

// Coupon notification
const notifyCouponAvailable = async (userIds, coupon) => {
  const notificationData = {
    title: '🎁 Special Discount Available!',
    message: `Use code ${coupon.code} and get ${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : '₹' + coupon.discountValue} off`,
    type: 'coupon_available',
    priority: 'medium',
    data: {
      couponId: coupon._id,
      couponCode: coupon.code
    }
  };

  await notifyMultipleUsers(userIds, notificationData);
};

// New order notification for restaurant
const notifyRestaurantNewOrder = async (order, restaurantOwnerId) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(restaurantOwnerId, {
      title: '🔔 New Order Received!',
      message: `Order #${orderRef} - ${order.items?.length || 0} items - ₹${order.total}`,
      type: 'new_order',
      priority: 'high',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        total: order.total,
        itemCount: order.items?.length || 0,
        paymentMethod: order.paymentMethod
      }
    });
  } catch (error) {
    console.error('Error notifying restaurant:', error);
  }
};

// Order confirmation for user
const notifyUserOrderPlaced = async (order) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(order.userId._id || order.userId, {
      title: '✅ Order Placed Successfully',
      message: `Your order #${orderRef} has been placed at ${order.restaurantId?.name || 'the restaurant'}`,
      type: 'order_placed',
      priority: 'high',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        restaurantId: order.restaurantId?._id,
        restaurantName: order.restaurantId?.name,
        total: order.total
      }
    });

    await sendOrderStatusSms(order, 'placed', orderRef);
  } catch (error) {
    console.error('Error notifying user order placed:', error);
  }
};

// Order ready for pickup notification
const notifyOrderReadyForPickup = async (order, deliveryPartnerId) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    if (deliveryPartnerId) {
      await notifyUser(deliveryPartnerId, {
        title: '📦 Order Ready for Pickup',
        message: `Order #${orderRef} is ready at ${order.restaurantId?.name}`,
        type: 'order_ready_pickup',
        priority: 'high',
        data: {
          orderId: order._id,
          orderNumber: orderRef,
          restaurantId: order.restaurantId?._id,
          restaurantName: order.restaurantId?.name,
          restaurantAddress: order.restaurantId?.address
        }
      });
    }
  } catch (error) {
    console.error('Error notifying delivery partner:', error);
  }
};

// Delivery assigned notification for user
const notifyUserDeliveryAssigned = async (order, deliveryPartner) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(order.userId._id || order.userId, {
      title: '🚴 Delivery Partner Assigned',
      message: `${deliveryPartner.name} will deliver your order #${orderRef}`,
      type: 'delivery_assigned',
      priority: 'medium',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        partnerName: deliveryPartner.name,
        partnerPhone: deliveryPartner.phone
      }
    });
  } catch (error) {
    console.error('Error notifying user delivery assigned:', error);
  }
};

// Payment reminder for COD
const notifyPaymentReminder = async (order) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(order.userId._id || order.userId, {
      title: '💰 Payment Reminder',
      message: `Please keep ₹${order.total} ready for order #${orderRef}`,
      type: 'payment_reminder',
      priority: 'medium',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        amount: order.total
      }
    });
  } catch (error) {
    console.error('Error sending payment reminder:', error);
  }
};

// Notify delivery partner about new order available
const notifyDeliveryPartnerNewOrder = async (order) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    // This will send push notification to all delivery partners
    // You can implement logic to notify only nearby partners based on location
    const notificationData = {
      title: '🆕 New Order Available',
      message: `Order #${orderRef} from ${order.restaurantId?.name} - ₹${order.deliveryFee} delivery fee`,
      type: 'new_order_available',
      priority: 'high',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        restaurantId: order.restaurantId?._id,
        restaurantName: order.restaurantId?.name,
        restaurantAddress: order.restaurantId?.address,
        deliveryFee: order.deliveryFee,
        deliveryAddress: order.addressId?.street,
        pickupLocation: order.restaurantId?.location
      }
    };
    
    // Note: In production, implement geolocation-based filtering
    // to notify only nearby delivery partners
    console.log('📢 New order available for delivery partners:', orderRef);
    
    return notificationData;
  } catch (error) {
    console.error('Error notifying delivery partners about new order:', error);
  }
};

// Notify delivery partner about order assignment
const notifyDeliveryPartnerAssignment = async (order, deliveryPartner) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(deliveryPartner._id || deliveryPartner, {
      title: '✅ Order Assigned to You',
      message: `Order #${orderRef} from ${order.restaurantId?.name}`,
      type: 'order_assigned',
      priority: 'high',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        restaurantId: order.restaurantId?._id,
        restaurantName: order.restaurantId?.name,
        restaurantAddress: order.restaurantId?.address,
        deliveryAddress: order.addressId,
        customerName: order.userId?.name,
        customerPhone: order.userId?.phone,
        deliveryFee: order.deliveryFee,
        total: order.total,
        paymentMethod: order.paymentMethod
      }
    });
  } catch (error) {
    console.error('Error notifying delivery partner assignment:', error);
  }
};

// Notify delivery partner when order is ready for pickup
const notifyDeliveryPartnerOrderReady = async (order, deliveryPartnerId) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(deliveryPartnerId, {
      title: '📦 Order Ready for Pickup',
      message: `Order #${orderRef} is ready at ${order.restaurantId?.name}`,
      type: 'order_ready_pickup',
      priority: 'high',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        restaurantId: order.restaurantId?._id,
        restaurantName: order.restaurantId?.name,
        restaurantAddress: order.restaurantId?.address,
        restaurantPhone: order.restaurantId?.phone
      }
    });
  } catch (error) {
    console.error('Error notifying delivery partner order ready:', error);
  }
};

// Notify delivery partner about order cancellation
const notifyDeliveryPartnerOrderCancelled = async (order, deliveryPartnerId) => {
  try {
    const orderRef = order.orderNumber || order._id.toString().slice(-8);
    
    await notifyUser(deliveryPartnerId, {
      title: '❌ Order Cancelled',
      message: `Order #${orderRef} has been cancelled`,
      type: 'order_cancelled',
      priority: 'high',
      data: {
        orderId: order._id,
        orderNumber: orderRef,
        cancellationReason: order.cancellationReason
      }
    });
  } catch (error) {
    console.error('Error notifying delivery partner order cancelled:', error);
  }
};

module.exports = {
  createNotification,
  sendPushNotification,
  notifyUser,
  notifyMultipleUsers,
  notifyOrderStatus,
  notifyCouponAvailable,
  notifyRestaurantNewOrder,
  notifyUserOrderPlaced,
  notifyOrderReadyForPickup,
  notifyUserDeliveryAssigned,
  notifyPaymentReminder,
  notifyDeliveryPartnerNewOrder,
  notifyDeliveryPartnerAssignment,
  notifyDeliveryPartnerOrderReady,
  notifyDeliveryPartnerOrderCancelled
};
