const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

dotenv.config();

const connectDB = require('../config/database');

const requiresDestructiveConfirm = () => {
  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';
  const confirmation = process.env.SEED_CONFIRM;
  const expected = 'I_UNDERSTAND_THIS_WILL_DELETE_DATA';

  if (!allowDestructive) return false;
  if (confirmation !== expected) {
    throw new Error(
      `Destructive seed blocked. Set SEED_CONFIRM=${expected} along with ALLOW_DESTRUCTIVE_SEED=true to proceed.`
    );
  }

  return true;
};

const getSeedMode = () => {
  const mode = String(process.env.SEED_MODE || 'safe').toLowerCase();
  return mode === 'reset' ? 'reset' : 'safe';
};

const assertSeedAllowedInEnvironment = (mode) => {
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const allowProdSeed = process.env.ALLOW_PROD_SEED === 'true';

  if (isProduction && !allowProdSeed) {
    throw new Error(
      `Seed blocked in production (mode=${mode}). Set ALLOW_PROD_SEED=true only if you intentionally want to run this.`
    );
  }
};

const seedData = async () => {
  try {
    await connectDB();

    const mode = getSeedMode();
    const isResetMode = mode === 'reset';

    assertSeedAllowedInEnvironment(mode);

    if (isResetMode) {
      const confirmed = requiresDestructiveConfirm();
      if (confirmed) {
        // Explicit destructive reset for local/demo use only.
        await User.deleteMany({});
        await Restaurant.deleteMany({});
        console.log('⚠️  Existing users and restaurants were deleted because SEED_MODE=reset was explicitly confirmed.');
      }
    } else {
      console.log('ℹ️  Running seed in safe mode. Existing production data will not be deleted.');
    }

    // Create admin user
    await User.findOneAndUpdate(
      { email: process.env.ADMIN_EMAIL || 'admin@flashbites.com' },
      {
        $setOnInsert: {
          name: 'Admin User',
          email: process.env.ADMIN_EMAIL || 'admin@flashbites.com',
          password: process.env.ADMIN_PASSWORD || 'Admin@123',
          phone: '9999999999',
          role: 'admin',
          isPhoneVerified: true,
        },
      },
      { upsert: true, new: true }
    );

    // Create test restaurant owner
    const owner = await User.findOneAndUpdate(
      { email: 'owner@example.com' },
      {
        $setOnInsert: {
          name: 'Restaurant Owner',
          email: 'owner@example.com',
          password: 'Owner@123',
          phone: '8888888888',
          role: 'restaurant_owner',
          isPhoneVerified: true,
        },
      },
      { upsert: true, new: true }
    );

    // Create test restaurant
    await Restaurant.findOneAndUpdate(
      { ownerId: owner._id, name: 'Tasty Bites' },
      {
        $setOnInsert: {
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
            coordinates: [72.8777, 19.0760]
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
          deliveryTime: 30,
        },
      },
      { upsert: true }
    );

    console.log(`✅ Database seed completed in ${mode.toUpperCase()} mode`);
    if (isResetMode) {
      console.log('⚠️  RESET mode was used. This should never be used against production data.');
    } else {
      console.log('✅ SAFE mode did not delete existing users/restaurants.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();