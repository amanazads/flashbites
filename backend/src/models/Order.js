const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: [Number]
  },
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    image: String
  }],
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  couponCode: String,
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryInstructions: String,
  estimatedDelivery: Date,
  confirmedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  cancellationFee: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);