const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const normalizeEndpoint = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeKeys = (keys) => {
  const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh.trim() : '';
  const auth = typeof keys?.auth === 'string' ? keys.auth.trim() : '';
  return { p256dh, auth };
};

const isValidEndpoint = (endpoint) => /^https:\/\//i.test(endpoint);

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    successResponse(res, 200, 'Notifications fetched successfully', {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch notifications', error.message);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    successResponse(res, 200, 'Notification marked as read', { notification });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update notification', error.message);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    errorResponse(res, 500, 'Failed to mark notifications as read', error.message);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    successResponse(res, 200, 'Notification deleted');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete notification', error.message);
  }
};

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
exports.subscribeToPush = async (req, res) => {
  try {
    const endpoint = normalizeEndpoint(req.body?.endpoint);
    const keys = sanitizeKeys(req.body?.keys || {});
    const deviceType = req.body?.deviceType;
    const browser = typeof req.body?.browser === 'string' ? req.body.browser.trim() : undefined;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return errorResponse(res, 400, 'Invalid subscription data');
    }

    if (!isValidEndpoint(endpoint)) {
      return errorResponse(res, 400, 'Invalid push endpoint');
    }

    const update = {
      user: req.user._id,
      endpoint,
      keys,
      isActive: true,
    };
    if (deviceType) update.deviceType = deviceType;
    if (browser) update.browser = browser;

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    successResponse(res, 201, 'Push subscription saved', { subscription });
  } catch (error) {
    errorResponse(res, 500, 'Failed to subscribe to push notifications', error.message);
  }
};

// @desc    Unsubscribe from push notifications
// @route   POST /api/notifications/unsubscribe
// @access  Private
exports.unsubscribeFromPush = async (req, res) => {
  try {
    const endpoint = normalizeEndpoint(req.body?.endpoint);
    if (!endpoint) {
      return errorResponse(res, 400, 'Endpoint is required');
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint, user: req.user._id },
      { isActive: false }
    );

    successResponse(res, 200, 'Unsubscribed from push notifications');
  } catch (error) {
    errorResponse(res, 500, 'Failed to unsubscribe', error.message);
  }
};

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key
// @access  Public
exports.getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return errorResponse(res, 500, 'VAPID keys not configured');
    }

    successResponse(res, 200, 'VAPID public key retrieved', { publicKey });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get VAPID public key', error.message);
  }
};

module.exports = exports;
