const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Restaurant = require('../src/models/Restaurant');
const { isPointInDeliveryZone, normalizeDeliveryZone } = require('../src/utils/deliveryGeo');

dotenv.config();

const isFiniteNumber = (value) => Number.isFinite(Number(value));

// Allow configuring the default radius via env or CLI
// Priority: --radius=XX CLI arg > process.env.DEFAULT_DELIVERY_RADIUS_KM > fallback 15
const cliRadiusArg = process.argv.find((arg) => arg.startsWith('--radius='));
const cliRadius = cliRadiusArg ? Number(cliRadiusArg.split('=')[1]) : NaN;
const DEFAULT_RADIUS_KM = Number.isFinite(Number(cliRadius))
  ? Number(cliRadius)
  : (Number(process.env.DEFAULT_DELIVERY_RADIUS_KM) || 15);

const hasValidLocation = (restaurant) => {
  const coords = restaurant?.location?.coordinates;
  return Array.isArray(coords) && coords.length === 2 && isFiniteNumber(coords[0]) && isFiniteNumber(coords[1]);
};

const radiusToDeltas = (radiusKm, latDeg) => {
  const earthRadiusKm = 6371;
  const fallback = Number(radiusKm) || DEFAULT_RADIUS_KM;
  const safeRadius = Math.min(Math.max(Number(fallback), 1), 100);
  const latRad = (Number(latDeg) * Math.PI) / 180;
  const angularDistance = safeRadius / earthRadiusKm;

  const dLat = (angularDistance * 180) / Math.PI;
  const cosLat = Math.max(Math.cos(latRad), 0.01);
  const dLng = ((angularDistance * 180) / Math.PI) / cosLat;

  return { dLat, dLng };
};

const buildBoxZone = (lng, lat, radiusKm) => {
  const { dLat, dLng } = radiusToDeltas(radiusKm, lat);
  const ring = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];

  return normalizeDeliveryZone({
    type: 'Polygon',
    coordinates: [ring],
  });
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }

  const forceAll = process.argv.includes('--all');

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
    minPoolSize: 1,
  });

  const restaurants = await Restaurant.find({
    isActive: true,
    isApproved: true,
  }).select('_id name location deliveryZone deliveryRadiusKm');

  let updated = 0;
  let skippedValid = 0;
  let skippedNoLocation = 0;
  const touched = [];

  for (const restaurant of restaurants) {
    if (!hasValidLocation(restaurant)) {
      skippedNoLocation += 1;
      continue;
    }

    const coords = restaurant.location.coordinates;
    const currentZoneLooksUsable = Boolean(restaurant.deliveryZone?.coordinates?.[0]?.length)
      && isPointInDeliveryZone(restaurant.deliveryZone, coords);

    if (!forceAll && currentZoneLooksUsable) {
      skippedValid += 1;
      continue;
    }

    const nextZone = buildBoxZone(coords[0], coords[1], restaurant.deliveryRadiusKm || DEFAULT_RADIUS_KM);
    if (!nextZone) {
      continue;
    }

    await Restaurant.findByIdAndUpdate(restaurant._id, {
      $set: {
        deliveryZone: nextZone,
      },
    });

    updated += 1;
    touched.push({
      id: String(restaurant._id),
      name: restaurant.name,
      radiusKm: Number(restaurant.deliveryRadiusKm || DEFAULT_RADIUS_KM),
      reason: currentZoneLooksUsable ? 'forced-refresh' : 'stale-or-missing-zone',
    });
  }

  console.log(JSON.stringify({
    forceAll,
    scanned: restaurants.length,
    updated,
    skippedValid,
    skippedNoLocation,
    touched,
  }, null, 2));

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('FIX_STALE_DELIVERY_ZONES_FAILED', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }
  process.exit(1);
});
