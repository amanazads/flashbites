const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const Restaurant = require('../src/models/Restaurant');

dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const hasValidCoords = (restaurant) => {
  const coords = restaurant?.location?.coordinates;
  return Array.isArray(coords) && coords.length === 2 && isFiniteNumber(coords[0]) && isFiniteNumber(coords[1]);
};

const buildQuery = (restaurant) => {
  const address = restaurant.address || {};
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    restaurant.name,
    'India'
  ].filter(Boolean);

  if (parts.length >= 2) {
    return parts.join(', ');
  }

  if (address.city) {
    return `${address.city}, India`;
  }

  return null;
};

const geocode = async (query) => {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    timeout: 8000,
    headers: {
      'User-Agent': 'FlashBites/1.0 (support@flashbites.in)'
    },
    params: {
      q: query,
      format: 'json',
      limit: 1
    }
  });

  const first = response?.data?.[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;

  return [lng, lat];
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

  const restaurants = await Restaurant.find({
    isActive: true
  }).select('name address location');

  let updated = 0;
  let skipped = 0;

  for (const restaurant of restaurants) {
    if (hasValidCoords(restaurant)) {
      skipped += 1;
      continue;
    }

    const query = buildQuery(restaurant);
    if (!query) {
      skipped += 1;
      continue;
    }

    try {
      const coords = await geocode(query);
      if (coords) {
        await Restaurant.findByIdAndUpdate(restaurant._id, {
          $set: {
            location: {
              type: 'Point',
              coordinates: coords
            }
          }
        });
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      skipped += 1;
    }

    // Avoid hitting Nominatim rate limits.
    await sleep(1100);
  }

  console.log(`Backfill complete. Updated: ${updated}, skipped: ${skipped}`);
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error('Backfill failed:', error.message);
  process.exit(1);
});
