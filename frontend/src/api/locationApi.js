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
