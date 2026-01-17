export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const CUISINES = [
  'Indian',
  'Chinese',
  'Italian',
  'Mexican',
  'Thai',
  'Japanese',
  'American',
  'Mediterranean',
  'Continental',
  'Fast Food',
];

export const FOOD_CATEGORIES = [
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
  'Breads',
  'Rice',
  'Snacks',
];

export const USER_ROLES = {
  USER: 'user',
  RESTAURANT_OWNER: 'restaurant_owner',
  ADMIN: 'admin',
};

export const MINIMUM_ORDER_VALUE = 199; // Minimum order value in INR

// Nearby locations with coordinates (Uttar Pradesh region)
export const NEARBY_LOCATIONS = [
  {
    id: 'ataria',
    name: 'Ataria',
    coordinates: { latitude: 27.2046, longitude: 80.6179 },
    district: 'Sitapur'
  },
  {
    id: 'sidhauli',
    name: 'Sidhauli',
    coordinates: { latitude: 27.2833, longitude: 80.8333 },
    district: 'Sitapur'
  },
  {
    id: 'sitapur',
    name: 'Sitapur',
    coordinates: { latitude: 27.5667, longitude: 80.6833 },
    district: 'Sitapur'
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    coordinates: { latitude: 26.8467, longitude: 80.9462 },
    district: 'Lucknow'
  },
  {
    id: 'barabanki',
    name: 'Barabanki',
    coordinates: { latitude: 26.9221, longitude: 81.1865 },
    district: 'Barabanki'
  },
  {
    id: 'lakhimpur',
    name: 'Lakhimpur Kheri',
    coordinates: { latitude: 27.9479, longitude: 80.7782 },
    district: 'Lakhimpur Kheri'
  },
  {
    id: 'hardoi',
    name: 'Hardoi',
    coordinates: { latitude: 27.3965, longitude: 80.1314 },
    district: 'Hardoi'
  },
  {
    id: 'shahjahanpur',
    name: 'Shahjahanpur',
    coordinates: { latitude: 27.8803, longitude: 79.9060 },
    district: 'Shahjahanpur'
  }
];
