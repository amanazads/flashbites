export const SELECTED_ADDRESS_KEY = 'fb_selected_address';

export const mapSavedAddressToSelection = (addr) => {
  const addrLng = Number(addr?.coordinates?.[0] ?? addr?.lng);
  const addrLat = Number(addr?.coordinates?.[1] ?? addr?.lat);
  const hasStoredCoords = Number.isFinite(addrLat) && Number.isFinite(addrLng) && (addrLat !== 0 || addrLng !== 0);

  if (!hasStoredCoords) return null;

  const type = addr?.type || 'other';
  const typeLabel = type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Other';

  return {
    id: addr._id,
    type,
    typeLabel,
    city: addr.city || '',
    state: addr.state || '',
    zipCode: addr.zipCode || '',
    street: addr.street || '',
    landmark: addr.landmark || '',
    fullAddress: addr.fullAddress || [addr.street, addr.landmark, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    latitude: addrLat,
    longitude: addrLng,
  };
};

export const buildManualAddressSelection = (payload = {}) => {
  const latitude = Number(payload?.latitude ?? payload?.lat ?? payload?.coordinates?.[1]);
  const longitude = Number(payload?.longitude ?? payload?.lng ?? payload?.coordinates?.[0]);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0);

  if (!hasCoords) return null;

  const type = payload?.type || 'other';
  const typeLabel = type === 'home' ? 'Home' : type === 'work' ? 'Work' : type === 'current' ? 'Current' : 'Other';

  return {
    id: payload?._id || payload?.id || `manual-${Date.now()}`,
    type,
    typeLabel,
    street: payload?.street || '',
    city: payload?.city || '',
    state: payload?.state || '',
    zipCode: payload?.zipCode || '',
    landmark: payload?.landmark || '',
    fullAddress: payload?.fullAddress || payload?.address || [payload?.street, payload?.landmark, payload?.city, payload?.state, payload?.zipCode].filter(Boolean).join(', '),
    latitude,
    longitude,
  };
};

export const readPersistedDeliveryAddress = () => {
  try {
    const raw = localStorage.getItem(SELECTED_ADDRESS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
