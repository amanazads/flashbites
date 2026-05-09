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

/**
 * Check if a restaurant is currently open based on its timing.
 * Supports overnight hours (e.g. open: '22:00', close: '02:00').
 * @param {Object} timing - { open: 'HH:MM', close: 'HH:MM' }
 * @param {boolean} acceptingOrders - backend flag
 * @returns {{ isOpen: boolean, opensAt: string, closesAt: string }}
 */
export const isRestaurantOpen = (timing, acceptingOrders = true) => {
  const result = { isOpen: false, opensAt: '', closesAt: '' };
  
  // If restaurant is not accepting orders, always closed
  if (!acceptingOrders) return result;
  
  // If no timing data, assume always open (for backward compatibility)
  if (!timing || !timing.open || !timing.close) {
    return { ...result, isOpen: true };
  }

  try {
    const now = new Date();
    const [openH, openM] = String(timing.open).split(':').map(Number);
    const [closeH, closeM] = String(timing.close).split(':').map(Number);

    // Validate parsed values
    if (!Number.isFinite(openH) || !Number.isFinite(openM) || 
        !Number.isFinite(closeH) || !Number.isFinite(closeM)) {
      return { ...result, isOpen: true }; // Invalid timing = assume open
    }

    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    let isOpen;
    if (openMins <= closeMins) {
      // Same day (e.g. 09:00 - 22:00)
      isOpen = nowMins >= openMins && nowMins < closeMins;
    } else {
      // Overnight (e.g. 22:00 - 02:00)
      isOpen = nowMins >= openMins || nowMins < closeMins;
    }

    result.isOpen = isOpen;
    result.opensAt = timing.open;
    result.closesAt = timing.close;
    return result;
  } catch (error) {
    console.warn('Error parsing restaurant timing:', error, timing);
    return { ...result, isOpen: true }; // On error, assume open
  }
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