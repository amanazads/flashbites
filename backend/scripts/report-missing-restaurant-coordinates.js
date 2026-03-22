const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Restaurant = require('../src/models/Restaurant');

dotenv.config();

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const hasValidCoords = (restaurant) => {
  const coords = restaurant?.location?.coordinates;
  return Array.isArray(coords) && coords.length === 2 && isFiniteNumber(coords[0]) && isFiniteNumber(coords[1]);
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
    minPoolSize: 1
  });

  const restaurants = await Restaurant.find({})
    .select('name address location isActive isApproved')
    .lean();

  const missing = restaurants.filter((r) => !hasValidCoords(r));

  if (missing.length === 0) {
    console.log('All restaurants have valid coordinates.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Missing coordinates: ${missing.length}`);
  for (const restaurant of missing) {
    const address = restaurant.address || {};
    const label = [restaurant.name, address.street, address.city, address.state, address.zipCode]
      .filter(Boolean)
      .join(', ');
    console.log(`- ${label || restaurant._id}`);
  }

  await mongoose.disconnect();
};

main().catch((error) => {
  console.error('Report failed:', error.message);
  process.exit(1);
});
