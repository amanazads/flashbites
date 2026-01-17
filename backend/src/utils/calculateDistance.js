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
const calculateDeliveryCharge = (distance) => {
  const DELIVERY_CHARGES = [
    { minDistance: 0, maxDistance: 2, charge: 20 },      // 0-2 km: ₹20
    { minDistance: 2, maxDistance: 5, charge: 30 },      // 2-5 km: ₹30
    { minDistance: 5, maxDistance: 10, charge: 50 },     // 5-10 km: ₹50
    { minDistance: 10, maxDistance: 20, charge: 80 },    // 10-20 km: ₹80
    { minDistance: 20, maxDistance: Infinity, charge: 100 } // 20+ km: ₹100
  ];

  const tier = DELIVERY_CHARGES.find(
    (tier) => distance >= tier.minDistance && distance < tier.maxDistance
  );
  
  return tier ? tier.charge : 100; // Default to ₹100 if no tier found
};

module.exports = { calculateDistance, calculateDeliveryCharge };