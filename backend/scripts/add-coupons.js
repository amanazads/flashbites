// Script to add sample coupons
const mongoose = require('mongoose');
const Coupon = require('../src/models/Coupon');
require('dotenv').config();

const sampleCoupons = [
  {
    code: 'FLASH120',
    description: 'Flat ₹120 off on orders above ₹249',
    discountType: 'fixed',
    discountValue: 120,
    minOrderValue: 249,
    maxDiscount: null,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: null,
    isActive: true
  },
  {
    code: 'FLASH100',
    description: 'Flat ₹100 off on orders above ₹199',
    discountType: 'percentage',
    discountValue: 100,
    minOrderValue: 199,
    maxDiscount: 100,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: 1000,
    isActive: true
  },
  {
    code: 'SAVE160',
    description: 'Flat ₹160 off on orders above ₹399',
    discountType: 'fixed',
    discountValue: 160,
    minOrderValue: 399,
    maxDiscount: null,
    validFrom: new Date('2026-01-01'),
    validTill: new Date('2026-12-31'),
    usageLimit: null,
    isActive: true
  },
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
