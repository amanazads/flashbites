const mongoose = require('mongoose');

const deliveryChargeRuleSchema = new mongoose.Schema(
  {
    minDistance: { type: Number, required: true },
    maxDistance: { type: Number, required: true },
    charge: { type: Number, required: true }
  },
  { _id: false }
);

const promoBannerSchema = new mongoose.Schema(
  {
    tag: { type: String, trim: true },
    bold: { type: String, trim: true },
    sub: { type: String, trim: true },
    cta: { type: String, trim: true },
    bg: { type: String, trim: true },
    img: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
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
    },
    promoBanners: {
      type: [promoBannerSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
