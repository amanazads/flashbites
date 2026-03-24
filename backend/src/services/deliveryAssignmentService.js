const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const ACTIVE_DELIVERY_STATUSES = ['confirmed', 'ready', 'out_for_delivery'];

const resolveRestaurantLocation = async (orderDoc) => {
  const restaurantId = orderDoc?.restaurantId?._id || orderDoc?.restaurantId;
  if (!restaurantId) return null;

  const restaurant = await Restaurant.findById(restaurantId)
    .select('location')
    .lean();

  if (!restaurant?.location?.coordinates || restaurant.location.coordinates.length < 2) {
    return null;
  }

  return restaurant.location;
};

const assignDeliveryPartner = async (orderDoc) => {
  const location = await resolveRestaurantLocation(orderDoc);
  if (!location) return null;

  const busyPartnerIds = await Order.distinct('deliveryPartnerId', {
    deliveryPartnerId: { $ne: null },
    status: { $in: ACTIVE_DELIVERY_STATUSES }
  });

  const partner = await User.findOne({
    role: 'delivery_partner',
    isOnDuty: true,
    _id: { $nin: busyPartnerIds },
    'location.type': 'Point',
    'location.coordinates.0': { $type: 'number' },
    'location.coordinates.1': { $type: 'number' },
    location: {
      $near: {
        $geometry: location,
        $maxDistance: 5000
      }
    }
  }).select('_id name phone');

  if (!partner) return null;

  orderDoc.deliveryPartnerId = partner._id;
  await orderDoc.save();

  return partner;
};

module.exports = {
  assignDeliveryPartner
};
