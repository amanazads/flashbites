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

const uniqueNonEmpty = (values = []) => (
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
);

const normalizeSearchText = (value) => (
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s,.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const tokenizeSearchText = (value) => (
  normalizeSearchText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
);

const scoreAutocompleteResult = (query, item) => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedLabel = normalizeSearchText(item?.label || item?.fullAddress || '');

  if (!normalizedQuery || !normalizedLabel) return 0;

  const queryTokens = tokenizeSearchText(normalizedQuery);
  const labelTokens = tokenizeSearchText(normalizedLabel);

  if (!queryTokens.length || !labelTokens.length) return 0;

  let score = 0;

  if (normalizedLabel === normalizedQuery) score += 160;
  if (normalizedLabel.startsWith(normalizedQuery)) score += 90;
  if (normalizedLabel.includes(normalizedQuery)) score += 45;

  for (const token of queryTokens) {
    if (labelTokens.includes(token)) {
      score += 20;
      continue;
    }

    const prefixMatch = labelTokens.some((candidate) => candidate.startsWith(token));
    if (prefixMatch) score += 10;
  }

  const queryWordCount = queryTokens.length;
  const exactMatches = queryTokens.filter((token) => labelTokens.includes(token)).length;
  if (exactMatches === queryWordCount) score += 30;

  if (item?.source === 'google') score += 3;

  return score;
};

const buildGeocodeQueries = (query) => {
  const base = String(query || '').trim();
  if (!base) return [];

  const withoutNearPrefix = base.replace(/^near\s+/i, '').trim();
  const parts = base.split(',').map((part) => part.trim()).filter(Boolean);

  const variants = [
    base,
    withoutNearPrefix,
    parts.slice(0, 5).join(', '),
    parts.slice(0, 4).join(', '),
    parts.slice(-4).join(', '),
    parts.slice(-3).join(', ')
  ];

  return uniqueNonEmpty(variants).filter((item) => item.length >= 3);
};

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
      components: 'country:in'
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
      limit: 12,
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
  const queries = buildGeocodeQueries(query);
  if (!queries.length) return null;

  for (const item of queries) {
    try {
      const googleResult = await geocodeWithGoogle(item);
      if (googleResult) return googleResult;
    } catch {
      // fallback to nominatim
    }

    try {
      const nominatimResult = await geocodeWithNominatim(item);
      if (nominatimResult) return nominatimResult;
    } catch {
      // continue to next variant
    }
  }

  return null;
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

  const dedupeByLabel = (items = []) => {
    const seen = new Set();
    const out = [];

    for (const item of items) {
      const key = String(item?.fullAddress || item?.label || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }

    return out;
  };

  let googleResults = [];
  let nominatimResults = [];

  try {
    googleResults = await autocompleteWithGoogle(query);
  } catch {
    googleResults = [];
  }

  try {
    nominatimResults = await autocompleteWithNominatim(query);
  } catch {
    nominatimResults = [];
  }

  const ranked = [...googleResults, ...nominatimResults]
    .map((item) => ({
      ...item,
      _score: scoreAutocompleteResult(query, item)
    }))
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...item }) => item);

  return dedupeByLabel(ranked).slice(0, 15);
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
