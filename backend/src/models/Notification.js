const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'order_placed',
      'order_confirmed', 
      'order_preparing',
      'order_ready',
      'order_picked_up',
      'order_delivered',
      'order_cancelled',
      'new_order',
      'order_ready_pickup',
      'delivery_assigned',
      'payment_reminder',
      'new_restaurant',
      'special_offer',
      'coupon_available',
      'restaurant_approved',
      'restaurant_rejected',
      'payment_received',
      'refund_processed'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    orderId: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    couponId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    metadata: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
