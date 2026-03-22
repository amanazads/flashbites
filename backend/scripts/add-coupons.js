// Script to add sample coupons
const mongoose = require('mongoose');
const Coupon = require('../src/models/Coupon');
const User = require('../src/models/User');
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
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('Missing MONGO_URI (or MONGODB_URI)');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL;
    let adminUser = null;
    if (adminEmail) {
      adminUser = await User.findOne({ email: adminEmail, role: 'admin' }).select('_id');
    }

    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' }).select('_id');
    }

    if (!adminUser) {
      throw new Error('No admin user found. Set ADMIN_EMAIL or create an admin user first.');
    }

    // Clear existing coupons if explicitly requested
    if (process.env.CLEAR_EXISTING_COUPONS === 'true') {
      await Coupon.deleteMany({});
      console.log('Cleared existing coupons');
    }

    // Insert sample coupons
    const result = await Coupon.insertMany(
      sampleCoupons.map((coupon) => ({
        ...coupon,
        createdBy: adminUser._id
      }))
    );
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
