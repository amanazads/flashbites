const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const toNumber = (value) => Number(value);

const normalizeCoordinates = (lng, lat) => {
  const lngNum = toNumber(lng);
  const latNum = toNumber(lat);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
  if (Math.abs(latNum) < 0.0001 && Math.abs(lngNum) < 0.0001) return null;

  return [lngNum, latNum];
};

const formatAddressFromParts = ({ street, landmark, city, state, zipCode }) => (
  [street, landmark, city, state, zipCode].filter(Boolean).join(', ')
);

const parseGoogleAddressComponents = (components = []) => {
  const findByType = (type) => components.find((component) => component.types?.includes(type))?.long_name || '';

  return {
    streetNumber: findByType('street_number'),
    route: findByType('route'),
    city: findByType('locality') || findByType('administrative_area_level_2') || findByType('sublocality') || '',
    state: findByType('administrative_area_level_1') || '',
    zipCode: findByType('postal_code') || ''
  };
};

const buildGoogleAutocompleteSuggestions = (predictions = []) => (
  predictions.map((item) => ({
    placeId: item.place_id,
    label: item.description,
    fullAddress: item.description,
    source: 'google'
  }))
);

const geocodeWithGoogle = async (query) => {
  if (!GOOGLE_API_KEY) return null;

  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    timeout: 7000,
    params: {
      address: query,
      key: GOOGLE_API_KEY,
      region: 'in'
    }
  });

  const first = response?.data?.results?.[0];
  if (!first?.geometry?.location) return null;

  const normalized = normalizeCoordinates(first.geometry.location.lng, first.geometry.location.lat);
  if (!normalized) return null;

  const parsed = parseGoogleAddressComponents(first.address_components || []);
  const street = [parsed.streetNumber, parsed.route].filter(Boolean).join(' ');

  return {
    fullAddress: first.formatted_address || query,
    street,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    coordinates: normalized,
    lat: normalized[1],
    lng: normalized[0],
    source: 'google'
  };
};

const reverseWithGoogle = async (lat, lng) => {
  if (!GOOGLE_API_KEY) return null;

  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    timeout: 7000,
    params: {
      latlng: `${lat},${lng}`,
      key: GOOGLE_API_KEY,
      region: 'in'
    }
  });

  const first = response?.data?.results?.[0];
  if (!first) return null;

  const normalized = normalizeCoordinates(lng, lat);
  if (!normalized) return null;

  const parsed = parseGoogleAddressComponents(first.address_components || []);
  const street = [parsed.streetNumber, parsed.route].filter(Boolean).join(' ');

  return {
    fullAddress: first.formatted_address,
    street,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    coordinates: normalized,
    lat: normalized[1],
    lng: normalized[0],
    source: 'google'
  };
};

const autocompleteWithGoogle = async (query) => {
  if (!GOOGLE_API_KEY) return [];

  const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
    timeout: 7000,
    params: {
      input: query,
      key: GOOGLE_API_KEY,
      components: 'country:in',
      types: 'address'
    }
  });

  return buildGoogleAutocompleteSuggestions(response?.data?.predictions || []);
};

const geocodeWithNominatim = async (query) => {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    timeout: 7000,
    headers: {
      'User-Agent': 'FlashBites/1.0 (support@flashbites.in)'
    },
    params: {
      q: query,
      format: 'jsonv2',
      addressdetails: 1,
      limit: 1,
      countrycodes: 'in'
    }
  });

  const first = response?.data?.[0];
  if (!first) return null;

  const normalized = normalizeCoordinates(first.lon, first.lat);
  if (!normalized) return null;

  const address = first.address || {};

  return {
    fullAddress: first.display_name,
    street: address.road || address.pedestrian || address.suburb || '',
    city: address.city || address.town || address.village || address.county || '',
    state: address.state || '',
    zipCode: address.postcode || '',
    coordinates: normalized,
    lat: normalized[1],
    lng: normalized[0],
    source: 'nominatim'
  };
};

const reverseWithNominatim = async (lat, lng) => {
  const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    timeout: 7000,
    headers: {
      'User-Agent': 'FlashBites/1.0 (support@flashbites.in)'
    },
    params: {
      lat,
      lon: lng,
      format: 'jsonv2',
      addressdetails: 1
    }
  });

  const data = response?.data;
  if (!data) return null;

  const normalized = normalizeCoordinates(lng, lat);
  if (!normalized) return null;

  const address = data.address || {};

  return {
    fullAddress: data.display_name || '',
    street: address.road || address.pedestrian || address.suburb || '',
    city: address.city || address.town || address.village || address.county || '',
    state: address.state || '',
    zipCode: address.postcode || '',
    coordinates: normalized,
    lat: normalized[1],
    lng: normalized[0],
    source: 'nominatim'
  };
};

const autocompleteWithNominatim = async (query) => {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    timeout: 7000,
    headers: {
      'User-Agent': 'FlashBites/1.0 (support@flashbites.in)'
    },
    params: {
      q: query,
      format: 'jsonv2',
      addressdetails: 1,
      limit: 6,
      countrycodes: 'in'
    }
  });

  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map((item) => ({
    placeId: String(item.place_id),
    label: item.display_name,
    fullAddress: item.display_name,
    city: item?.address?.city || item?.address?.town || item?.address?.village || item?.address?.county || '',
    state: item?.address?.state || '',
    zipCode: item?.address?.postcode || '',
    lat: Number(item.lat),
    lng: Number(item.lon),
    source: 'nominatim'
  }));
};

const geocodeAddress = async (query) => {
  if (!query || String(query).trim().length < 3) return null;

  try {
    const googleResult = await geocodeWithGoogle(query);
    if (googleResult) return googleResult;
  } catch {
    // fallback to nominatim
  }

  try {
    return await geocodeWithNominatim(query);
  } catch {
    return null;
  }
};

const reverseGeocode = async (lat, lng) => {
  const normalized = normalizeCoordinates(lng, lat);
  if (!normalized) return null;

  try {
    const googleResult = await reverseWithGoogle(normalized[1], normalized[0]);
    if (googleResult) return googleResult;
  } catch {
    // fallback to nominatim
  }

  try {
    return await reverseWithNominatim(normalized[1], normalized[0]);
  } catch {
    return null;
  }
};

const autocompleteAddress = async (query) => {
  if (!query || String(query).trim().length < 3) return [];

  try {
    const googleResults = await autocompleteWithGoogle(query);
    if (googleResults.length) return googleResults;
  } catch {
    // fallback to nominatim
  }

  try {
    return await autocompleteWithNominatim(query);
  } catch {
    return [];
  }
};

const buildFullAddress = ({ street, landmark, city, state, zipCode }) => (
  formatAddressFromParts({ street, landmark, city, state, zipCode })
);

module.exports = {
  normalizeCoordinates,
  geocodeAddress,
  reverseGeocode,
  autocompleteAddress,
  buildFullAddress
};
