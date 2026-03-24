const { getDistance } = require('./distance');

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => getDistance(lat1, lon1, lat2, lon2);
  const distance = R * c; // Distance in km
  
  return distance;
};

// Calculate delivery charge based on distance (platform-controlled)
const DEFAULT_DELIVERY_CHARGES = [
  { minDistance: 0, maxDistance: 5, charge: 0 },
  { minDistance: 5, maxDistance: 15, charge: 25 },
  { minDistance: 15, maxDistance: 9999, charge: 30 }
];

const calculateDeliveryCharge = (distance, rules = DEFAULT_DELIVERY_CHARGES) => {
  const tiers = Array.isArray(rules) && rules.length > 0 ? rules : DEFAULT_DELIVERY_CHARGES;
  const tier = tiers.find((tier) => distance >= tier.minDistance && distance < tier.maxDistance);
  return tier ? tier.charge : 0;
};

module.exports = { calculateDistance, calculateDeliveryCharge, DEFAULT_DELIVERY_CHARGES };