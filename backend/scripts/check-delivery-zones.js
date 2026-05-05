const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Restaurant = require('../src/models/Restaurant');
const { isPointInDeliveryZone } = require('../src/utils/deliveryGeo');

const hasValidLocation = (restaurant) => {
  const coords = restaurant?.location?.coordinates;
  return Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(Number(coords[0]))
    && Number.isFinite(Number(coords[1]));
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
    minPoolSize: 1,
  });

  const restaurants = await Restaurant.find({ isApproved: true, isActive: true })
    .select('_id name location deliveryZone updatedAt')
    .lean();

  const issues = [];

  for (const restaurant of restaurants) {
    if (!hasValidLocation(restaurant)) {
      issues.push({
        id: String(restaurant._id),
        name: restaurant.name,
        issue: 'missing-or-invalid-location',
      });
      continue;
    }

    const coords = restaurant.location.coordinates;
    const hasZone = Boolean(restaurant.deliveryZone?.coordinates?.[0]?.length);

    if (!hasZone) {
      issues.push({
        id: String(restaurant._id),
        name: restaurant.name,
        issue: 'missing-delivery-zone',
      });
      continue;
    }

    const includesRestaurantPoint = isPointInDeliveryZone(restaurant.deliveryZone, [coords[0], coords[1]]);
    if (!includesRestaurantPoint) {
      issues.push({
        id: String(restaurant._id),
        name: restaurant.name,
        issue: 'zone-does-not-include-restaurant-location',
      });
    }
  }

  const result = {
    scanned: restaurants.length,
    healthy: restaurants.length - issues.length,
    issuesCount: issues.length,
    issues,
  };

  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();

  if (issues.length > 0) {
    process.exitCode = 2;
  }
};

main().catch(async (error) => {
  console.error('CHECK_DELIVERY_ZONES_FAILED', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }
  process.exit(1);
});
