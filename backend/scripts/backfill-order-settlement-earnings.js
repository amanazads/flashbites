/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const Order = require('../src/models/Order');
const Restaurant = require('../src/models/Restaurant');
const PlatformSettings = require('../src/models/PlatformSettings');

const roundToTwo = (value) => Math.round((Number(value) || 0) * 100) / 100;

const normalizeRate = (rawRate, fallback = 0.75) => {
  const rate = Number(rawRate);
  if (!Number.isFinite(rate)) return fallback;
  if (rate < 0) return 0;
  if (rate > 1) return 1;
  return rate;
};

const getPartnerEarningFromSnapshot = (snapshot = {}) => {
  const perOrder = Number(snapshot.perOrder);
  const bonusAmount = Number(snapshot.bonusAmount);
  const bonusApplied = Boolean(snapshot.bonusApplied);

  const value = (Number.isFinite(perOrder) ? perOrder : 0)
    + (bonusApplied && Number.isFinite(bonusAmount) ? bonusAmount : 0);

  return value > 0 ? roundToTwo(value) : 0;
};

const getRestaurantSettlementEarning = (order, payoutRate) => {
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const settlementBase = Math.max(subtotal - discount, 0);
  return roundToTwo(settlementBase * payoutRate);
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const [settings, restaurants] = await Promise.all([
    PlatformSettings.findOne().select('restaurantPayoutRate deliveryPartnerPayout').lean(),
    Restaurant.find().select('_id payoutRateOverride').lean()
  ]);

  const globalRestaurantRate = normalizeRate(settings?.restaurantPayoutRate, 0.75);
  const globalPartnerPayout = {
    perOrder: Number(settings?.deliveryPartnerPayout?.perOrder) || 40,
    bonusThreshold: Number(settings?.deliveryPartnerPayout?.bonusThreshold) || 13,
    bonusAmount: Number(settings?.deliveryPartnerPayout?.bonusAmount) || 850
  };

  const restaurantRateMap = new Map(
    restaurants.map((restaurant) => [
      String(restaurant._id),
      normalizeRate(restaurant.payoutRateOverride, globalRestaurantRate)
    ])
  );

  const cursor = Order.find({ status: 'delivered' }).cursor();
  const bulkOps = [];
  let scanned = 0;
  let changed = 0;

  for await (const order of cursor) {
    scanned += 1;

    const restaurantRate = normalizeRate(
      order.restaurantPayoutRateSnapshot,
      restaurantRateMap.get(String(order.restaurantId)) ?? globalRestaurantRate
    );

    let partnerEarning = Number(order.deliveryPartnerEarning || 0);
    if (!(Number.isFinite(partnerEarning) && partnerEarning > 0)) {
      partnerEarning = getPartnerEarningFromSnapshot(order.deliveryPartnerPayoutSnapshot || {});
    }

    const hasDeliveryPartner = Boolean(order.deliveryPartnerId);
    const hasSnapshotPayout = getPartnerEarningFromSnapshot(order.deliveryPartnerPayoutSnapshot || {}) > 0;

    if (!(Number.isFinite(partnerEarning) && partnerEarning > 0) && hasDeliveryPartner) {
      partnerEarning = roundToTwo(globalPartnerPayout.perOrder);
    }

    const restaurantEarning = Number(order.restaurantEarning || 0) > 0
      ? roundToTwo(order.restaurantEarning)
      : getRestaurantSettlementEarning(order, restaurantRate);

    const adminEarning = roundToTwo((Number(order.total) || 0) - restaurantEarning - (partnerEarning > 0 ? partnerEarning : 0));

    const update = {
      restaurantPayoutRateSnapshot: restaurantRate,
      restaurantEarning,
      adminEarning,
      platformProfit: adminEarning,
      totalAmount: roundToTwo(order.total || 0)
    };

    if (partnerEarning > 0) {
      update.deliveryPartnerEarning = partnerEarning;
      update.deliveryEarning = partnerEarning;
    }

    if (hasDeliveryPartner && !hasSnapshotPayout) {
      update.deliveryPartnerPayoutSnapshot = {
        perOrder: roundToTwo(globalPartnerPayout.perOrder),
        bonusThreshold: globalPartnerPayout.bonusThreshold,
        bonusAmount: roundToTwo(globalPartnerPayout.bonusAmount),
        bonusApplied: false
      };
    }

    const shouldWrite =
      roundToTwo(order.restaurantPayoutRateSnapshot) !== update.restaurantPayoutRateSnapshot
      || roundToTwo(order.restaurantEarning) !== update.restaurantEarning
      || roundToTwo(order.adminEarning) !== update.adminEarning
      || roundToTwo(order.platformProfit) !== update.platformProfit
      || roundToTwo(order.totalAmount) !== update.totalAmount
      || (partnerEarning > 0 && roundToTwo(order.deliveryPartnerEarning) !== update.deliveryPartnerEarning)
      || (partnerEarning > 0 && roundToTwo(order.deliveryEarning) !== update.deliveryEarning)
      || (hasDeliveryPartner && !hasSnapshotPayout);

    if (shouldWrite) {
      changed += 1;
      bulkOps.push({
        updateOne: {
          filter: { _id: order._id },
          update: { $set: update }
        }
      });
    }

    if (bulkOps.length >= 500) {
      await Order.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
      console.log(`Processed ${scanned} delivered orders...`);
    }
  }

  if (bulkOps.length > 0) {
    await Order.bulkWrite(bulkOps, { ordered: false });
  }

  const restaurantTotals = await Order.aggregate([
    { $match: { status: 'delivered' } },
    {
      $group: {
        _id: '$restaurantId',
        totalEarnings: { $sum: { $ifNull: ['$restaurantEarning', 0] } }
      }
    }
  ]);

  const restaurantBulk = restaurantTotals.map((row) => ({
    updateOne: {
      filter: { _id: row._id },
      update: { $set: { totalEarnings: roundToTwo(row.totalEarnings) } }
    }
  }));

  if (restaurantBulk.length > 0) {
    await Restaurant.bulkWrite(restaurantBulk, { ordered: false });
  }

  console.log('Backfill complete.');
  console.log(`Delivered orders scanned: ${scanned}`);
  console.log(`Delivered orders updated: ${changed}`);
  console.log(`Restaurants totals recalculated: ${restaurantBulk.length}`);

  await mongoose.connection.close();
};

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Backfill failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  });
