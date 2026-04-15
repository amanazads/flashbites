const SELECTED_ADDRESS_KEY = 'fb_selected_address';

const INVALID_LABELS = new Set(['current area', 'nearby area']);

const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const getStoredSelectedDeliveryAddress = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SELECTED_ADDRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const getDeliveryAddressLabel = (selectedDeliveryAddress, fallback = 'Current Area') => {
  const resolvedAddress = selectedDeliveryAddress || getStoredSelectedDeliveryAddress();
  if (!resolvedAddress) return fallback;

  const candidates = [
    resolvedAddress.city,
    resolvedAddress.fullAddress,
    resolvedAddress.street,
    resolvedAddress.label,
    resolvedAddress.typeLabel,
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (!value) continue;
    if (INVALID_LABELS.has(value.toLowerCase())) continue;
    return value;
  }

  return fallback;
};
