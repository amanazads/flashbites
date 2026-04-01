import { calculateDistance } from './helpers';

export const DELIVERY_RADIUS_KM = 20;
export const LOCATION_BANNER_DISMISSED_KEY = 'fb_location_banner_dismissed';
export const LOCATION_PERMISSION_STATE_KEY = 'fb_location_permission_state';
export const SELECTED_ADDRESS_KEY = 'fb_selected_address';
export const DELIVERY_LOCATION_UPDATED_EVENT = 'fb:delivery-location-updated';
export const OPEN_LOCATION_MODAL_EVENT = 'fb:open-location-modal';

const NOMINATIM_HEADERS = {
  'User-Agent': 'FlashBites/1.0 (info.flashbites@gmail.com)',
  'Accept-Language': 'en',
};

export const hasValidCoordinates = (entity) => {
  const coords = entity?.location?.coordinates;
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(Number(coords[0])) &&
    Number.isFinite(Number(coords[1])) &&
    (Number(coords[0]) !== 0 || Number(coords[1]) !== 0)
  );
};

export const extractLatLng = (entity) => {
  if (!hasValidCoordinates(entity)) return null;
  const [lng, lat] = entity.location.coordinates.map(Number);
  return { lat, lng };
};

export const getStoredDeliveryLocation = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(SELECTED_ADDRESS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const persistDeliveryLocation = (location) => {
  if (typeof window === 'undefined') return;
  if (!location) {
    localStorage.removeItem(SELECTED_ADDRESS_KEY);
    window.dispatchEvent(new CustomEvent(DELIVERY_LOCATION_UPDATED_EVENT, { detail: null }));
    return;
  }
  localStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(location));
  window.dispatchEvent(new CustomEvent(DELIVERY_LOCATION_UPDATED_EVENT, { detail: location }));
};

export const openDeliveryLocationModal = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_LOCATION_MODAL_EVENT, { detail }));
};

export const requestCurrentPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 120000,
      ...options,
    });
  });

export const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();
    const address = data?.address || {};

    return {
      displayName: data?.display_name || 'Current Location',
      street:
        [
          address.house_number,
          address.road || address.residential || address.suburb || address.neighbourhood,
        ]
          .filter(Boolean)
          .join(' ') || data?.display_name?.split(',').slice(0, 2).join(', ') || '',
      city: address.city || address.town || address.village || address.county || '',
      state: address.state || '',
      zipCode: address.postcode || '',
      latitude: Number(lat),
      longitude: Number(lng),
    };
  } catch {
    return null;
  }
};

export const geocodeAddress = async (query) => {
  if (!query?.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in&addressdetails=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();
    const first = data?.[0];

    if (!first) return null;

    return {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      displayName: first.display_name,
      city: first.address?.city || first.address?.town || first.address?.village || first.address?.county || '',
      state: first.address?.state || '',
      zipCode: first.address?.postcode || '',
    };
  } catch {
    return null;
  }
};

export const lookupIndianPincode = async (zipCode) => {
  const value = String(zipCode || '').trim();
  if (!/^\d{6}$/.test(value)) return null;

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
    const data = await response.json();
    const office = data?.[0]?.PostOffice?.[0];

    if (data?.[0]?.Status !== 'Success' || !office) return null;

    return {
      city: office.District,
      state: office.State,
      officeName: office.Name,
      country: office.Country,
      zipCode: value,
    };
  } catch {
    return null;
  }
};

export const buildAddressLabel = (address = {}) =>
  [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');

export const formatLocationLabel = (location = {}) => {
  if (location?.label) return location.label;

  return (
    [location.street, location.city, location.state]
      .filter(Boolean)
      .slice(0, 2)
      .join(', ') ||
    [location.city, location.state].filter(Boolean).join(', ') ||
    location.zipCode ||
    'Selected location'
  );
};

export const createDeliveryLocation = (location = {}, overrides = {}) => ({
  street: location.street || '',
  city: location.city || '',
  state: location.state || '',
  zipCode: location.zipCode || '',
  latitude: Number(location.latitude),
  longitude: Number(location.longitude),
  label: formatLocationLabel({ ...location, ...overrides }),
  ...overrides,
});

export const resolveAddressCoordinates = async (address = {}) => {
  const fullAddress = buildAddressLabel(address);
  const queries = [fullAddress, [address.city, address.state, address.zipCode, 'India'].filter(Boolean).join(', ')];

  for (const query of queries) {
    const result = await geocodeAddress(query);
    if (result?.latitude && result?.longitude) return result;
  }

  return null;
};

export const getRestaurantDistance = (restaurant, deliveryLocation) => {
  const restaurantCoords = extractLatLng(restaurant);
  if (!restaurantCoords || !deliveryLocation?.latitude || !deliveryLocation?.longitude) return Infinity;

  return calculateDistance(
    Number(deliveryLocation.latitude),
    Number(deliveryLocation.longitude),
    restaurantCoords.lat,
    restaurantCoords.lng
  );
};

export const enrichRestaurantsWithDistance = (restaurants = [], deliveryLocation) =>
  restaurants.map((restaurant) => ({
    ...restaurant,
    distance: getRestaurantDistance(restaurant, deliveryLocation),
  }));

export const getServiceableRestaurants = (restaurants = [], deliveryLocation, radiusKm = DELIVERY_RADIUS_KM) =>
  enrichRestaurantsWithDistance(restaurants, deliveryLocation)
    .filter((restaurant) => Number.isFinite(restaurant.distance) && restaurant.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

export const isRestaurantWithinDeliveryRadius = (restaurant, deliveryLocation, radiusKm = DELIVERY_RADIUS_KM) => {
  const distance = getRestaurantDistance(restaurant, deliveryLocation);
  return {
    distance,
    isServiceable: Number.isFinite(distance) && distance <= radiusKm,
  };
};
