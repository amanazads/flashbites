// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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