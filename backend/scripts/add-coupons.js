// Script to add sample coupons
const mongoose = require('mongoose');
const Coupon = require('../src/models/Coupon');
require('dotenv').config();

const sampleCoupons = [
  {
    code: 'FLASH50',
    description: 'Flat ₹50 off on orders above ₹299',
    discountType: 'fixed',
    discountValue: 50,
    minOrderValue: 299,
    maxDiscount: null,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: null,
    isActive: true
  },
  {
    code: 'FIRST20',
    description: '20% off on your first order (max ₹100)',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 199,
    maxDiscount: 100,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: 1000,
    isActive: true
  },
  {
    code: 'SAVE100',
    description: 'Flat ₹100 off on orders above ₹500',
    discountType: 'fixed',
    discountValue: 100,
    minOrderValue: 500,
    maxDiscount: null,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: null,
    isActive: true
  },
  {
    code: 'WEEKEND30',
    description: '30% off on weekend orders (max ₹150)',
    discountType: 'percentage',
    discountValue: 30,
    minOrderValue: 299,
    maxDiscount: 150,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: 500,
    isActive: true
  }
];

const addCoupons = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing coupons (optional)
    await Coupon.deleteMany({});
    console.log('Cleared existing coupons');

    // Insert sample coupons
    const result = await Coupon.insertMany(sampleCoupons);
    console.log(`Added ${result.length} coupons successfully:`);
    result.forEach(coupon => {
      console.log(`- ${coupon.code}: ${coupon.description}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error adding coupons:', error);
    process.exit(1);
  }
};

addCoupons();
