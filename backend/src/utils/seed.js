const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

dotenv.config();

const connectDB = require('../config/database');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Restaurant.deleteMany();

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@flashbites.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      phone: '9999999999',
      role: 'admin',
      isPhoneVerified: true
    });

    // Create test restaurant owner
    const owner = await User.create({
      name: 'Restaurant Owner',
      email: 'owner@example.com',
      password: 'Owner@123',
      phone: '8888888888',
      role: 'restaurant_owner',
      isPhoneVerified: true
    });

    // Create test restaurant
    await Restaurant.create({
      ownerId: owner._id,
      name: 'Tasty Bites',
      email: 'contact@tastybites.com',
      phone: '7777777777',
      description: 'Best food in town',
      cuisines: ['Indian', 'Chinese'],
      address: {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001'
      },
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.0760] // [longitude, latitude]
      },
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
      rating: 4.5,
      isActive: true,
      isApproved: true,
      timing: {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday: { open: '09:00', close: '22:00' },
        friday: { open: '09:00', close: '23:00' },
        saturday: { open: '09:00', close: '23:00' },
        sunday: { open: '10:00', close: '22:00' }
      },
      deliveryFee: 30,
      deliveryTime: 30
    });

    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();