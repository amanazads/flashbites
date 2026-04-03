const mongoose = require('mongoose');

const feeTemplateSchema = new mongoose.Schema({
  // Template name and description
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    unique: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },

  // Fee configuration
  deliveryFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  platformFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.05,
  },
  commissionPercent: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.15,
  },

  // Restaurants using this template
  restaurantIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
  ],

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
feeTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('FeeTemplate', feeTemplateSchema);
