const mongoose = require('mongoose');

const deliveryChargeRuleSchema = new mongoose.Schema(
  {
    minDistance: { type: Number, required: true },
    maxDistance: { type: Number, required: true },
    charge: { type: Number, required: true }
  },
  { _id: false }
);

const platformSettingsSchema = new mongoose.Schema(
  {
    platformFee: { type: Number, default: 25, min: 0 },
    taxRate: { type: Number, default: 0.05, min: 0, max: 1 },
    deliveryChargeRules: {
      type: [deliveryChargeRuleSchema],
      default: [
        { minDistance: 0, maxDistance: 5, charge: 0 },
        { minDistance: 5, maxDistance: 15, charge: 25 },
        { minDistance: 15, maxDistance: 9999, charge: 30 }
      ]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
