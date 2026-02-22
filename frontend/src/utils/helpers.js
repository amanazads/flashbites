export const calculateCartTotal = (items) => {
  return items.reduce((total, item) => total + (Number(item.price) || 0) * (item.quantity || 1), 0);
};

export const calculateOrderTotal = (subtotal, deliveryFee, tax, discount) => {
  return subtotal + deliveryFee + tax - discount;
};

export const getOrderStatusStep = (status) => {
  const steps = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
  return steps.indexOf(status);
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const isRestaurantOpen = (timing) => {
  if (!timing) return false;
  
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todayTiming = timing[currentDay];
  if (!todayTiming || todayTiming.isClosed) return false;
  
  return currentTime >= todayTiming.open && currentTime <= todayTiming.close;
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
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
  
  return distance; // Return number, not string
};