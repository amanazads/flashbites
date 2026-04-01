import axios from './axios';

export const autocompleteAddress = async (query) => {
  const response = await axios.get('/location/autocomplete', {
    params: { q: query }
  });
  return response.data;
};

export const geocodeAddressQuery = async (query) => {
  const response = await axios.get('/location/geocode', {
    params: { q: query }
  });
  return response.data;
};

export const reverseGeocodeCoordinates = async (lat, lng) => {
  const response = await axios.get('/location/reverse', {
    params: { lat, lng }
  });
  return response.data;
};

const NOMINATIM_HEADERS = {
  Accept: 'application/json'
};

export const autocompleteAddressFallback = async (query) => {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 3) return { suggestions: [] };

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'in');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: NOMINATIM_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Autocomplete fallback failed with status ${response.status}`);
  }

  const data = await response.json();
  const suggestions = Array.isArray(data) ? data.map((item) => ({
    placeId: String(item.place_id),
    label: item.display_name,
    fullAddress: item.display_name,
    city: item?.address?.city || item?.address?.town || item?.address?.village || item?.address?.county || '',
    state: item?.address?.state || '',
    zipCode: item?.address?.postcode || '',
    lat: Number(item.lat),
    lng: Number(item.lon),
    source: 'nominatim-browser'
  })) : [];

  return { suggestions };
};

export const geocodeAddressFallback = async (query) => {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 3) return { location: null };

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'in');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: NOMINATIM_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Geocode fallback failed with status ${response.status}`);
  }

  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first) return { location: null };

  return {
    location: {
      fullAddress: first.display_name,
      street: first?.address?.road || first?.address?.pedestrian || first?.address?.suburb || '',
      city: first?.address?.city || first?.address?.town || first?.address?.village || first?.address?.county || '',
      state: first?.address?.state || '',
      zipCode: first?.address?.postcode || '',
      lat: Number(first.lat),
      lng: Number(first.lon),
      source: 'nominatim-browser'
    }
  };
};
