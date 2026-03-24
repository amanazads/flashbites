require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.SMOKE_API_BASE || process.env.API_BASE || 'http://localhost:8080/api';
const TEST_EMAIL = process.env.SMOKE_USER_EMAIL || process.env.TEST_USER_EMAIL;
const TEST_PHONE = process.env.SMOKE_USER_PHONE || process.env.TEST_USER_PHONE;
const TEST_PASSWORD = process.env.SMOKE_USER_PASSWORD || process.env.TEST_USER_PASSWORD;
const FIXED_RESTAURANT_ID = process.env.SMOKE_RESTAURANT_ID || null;

const CREATE_ADDRESS_IF_MISSING = process.env.SMOKE_CREATE_ADDRESS_IF_MISSING === 'true';
const ADDRESS_STREET = process.env.SMOKE_ADDRESS_STREET || '100 Main Road';
const ADDRESS_CITY = process.env.SMOKE_ADDRESS_CITY || 'Bengaluru';
const ADDRESS_STATE = process.env.SMOKE_ADDRESS_STATE || 'Karnataka';
const ADDRESS_ZIP = process.env.SMOKE_ADDRESS_ZIP || '560001';
const ADDRESS_FULL = process.env.SMOKE_ADDRESS_FULL || `${ADDRESS_STREET}, ${ADDRESS_CITY}, ${ADDRESS_STATE} ${ADDRESS_ZIP}`;
const ADDRESS_LAT = Number(process.env.SMOKE_ADDRESS_LAT);
const ADDRESS_LNG = Number(process.env.SMOKE_ADDRESS_LNG);

const log = (...args) => console.log('[smoke-address-flow]', ...args);
const fail = (message) => {
  console.error('[smoke-address-flow] ERROR:', message);
  process.exit(1);
};

const getTokenFromLoginResponse = (payload) => (
  payload?.data?.accessToken
  || payload?.data?.token
  || payload?.accessToken
  || payload?.token
  || null
);

const getAddressCoords = (address) => {
  if (!address) return null;

  if (Array.isArray(address.coordinates) && address.coordinates.length === 2) {
    const lng = Number(address.coordinates[0]);
    const lat = Number(address.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
  }

  if (address.location?.type === 'Point' && Array.isArray(address.location.coordinates) && address.location.coordinates.length === 2) {
    const lng = Number(address.location.coordinates[0]);
    const lat = Number(address.location.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
  }

  const lat = Number(address.lat);
  const lng = Number(address.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];

  return null;
};

const ensureCredentials = () => {
  if (!TEST_PASSWORD) {
    fail('Missing SMOKE_USER_PASSWORD (or TEST_USER_PASSWORD).');
  }

  if (!TEST_EMAIL && !TEST_PHONE) {
    fail('Provide SMOKE_USER_EMAIL (or TEST_USER_EMAIL) OR SMOKE_USER_PHONE (or TEST_USER_PHONE).');
  }
};

const maybeCreateAddress = async (client) => {
  if (!CREATE_ADDRESS_IF_MISSING) {
    return null;
  }

  if (!Number.isFinite(ADDRESS_LAT) || !Number.isFinite(ADDRESS_LNG)) {
    fail('SMOKE_CREATE_ADDRESS_IF_MISSING=true requires SMOKE_ADDRESS_LAT and SMOKE_ADDRESS_LNG.');
  }

  const payload = {
    type: 'home',
    street: ADDRESS_STREET,
    city: ADDRESS_CITY,
    state: ADDRESS_STATE,
    zipCode: ADDRESS_ZIP,
    fullAddress: ADDRESS_FULL,
    coordinates: [ADDRESS_LNG, ADDRESS_LAT],
    lat: ADDRESS_LAT,
    lng: ADDRESS_LNG,
    isDefault: true,
  };

  const res = await client.post('/users/addresses', payload);
  const address = res?.data?.data?.address;
  if (!address?._id) {
    fail('Failed to create address: response did not include address id.');
  }

  log('Created fallback address:', address._id);
  return address;
};

const pickAddress = async (client) => {
  const res = await client.get('/users/addresses');
  const addresses = res?.data?.data?.addresses || [];

  const withCoords = addresses.find((addr) => Boolean(getAddressCoords(addr)));
  if (withCoords) {
    log('Using existing address:', withCoords._id);
    return withCoords;
  }

  log('No saved addresses with coordinates found.');
  return await maybeCreateAddress(client);
};

const pickRestaurant = async (client, lat, lng) => {
  const query = FIXED_RESTAURANT_ID
    ? { params: { limit: 100 } }
    : { params: { addressLat: lat, addressLng: lng, radius: 25000, limit: 30 } };

  const res = await client.get('/restaurants', query);
  const restaurants = res?.data?.data?.restaurants || [];

  if (restaurants.length === 0) {
    fail('No restaurants returned for selected address coordinates.');
  }

  if (FIXED_RESTAURANT_ID) {
    const pinned = restaurants.find((r) => String(r._id) === String(FIXED_RESTAURANT_ID));
    if (!pinned) {
      fail(`SMOKE_RESTAURANT_ID=${FIXED_RESTAURANT_ID} not found in response.`);
    }
    return pinned;
  }

  return restaurants[0];
};

const pickMenuItem = async (client, restaurantId) => {
  const res = await client.get(`/menu/${restaurantId}`);
  const items = res?.data?.data?.items || [];

  const item = items.find((i) => i?.isAvailable !== false && i?.isInStock !== false);
  if (!item?._id) {
    fail(`No available menu item found for restaurant ${restaurantId}.`);
  }

  return item;
};

const run = async () => {
  try {
    ensureCredentials();
    log('API base:', API_BASE);

    const loginBody = TEST_EMAIL
      ? { email: TEST_EMAIL, password: TEST_PASSWORD }
      : { phone: TEST_PHONE, password: TEST_PASSWORD };

    const loginRes = await axios.post(`${API_BASE}/auth/login`, loginBody);
    const token = getTokenFromLoginResponse(loginRes?.data);

    if (!token) {
      fail('Login succeeded but no access token was found in response.');
    }

    const client = axios.create({
      baseURL: API_BASE,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 20000,
    });

    const address = await pickAddress(client);
    if (!address?._id) {
      fail('No address available. Save an address with coordinates, or set SMOKE_CREATE_ADDRESS_IF_MISSING=true with SMOKE_ADDRESS_LAT/LNG.');
    }

    const coords = getAddressCoords(address);
    if (!coords) {
      fail(`Selected address ${address._id} has no valid coordinates.`);
    }

    const [lng, lat] = coords;
    const restaurant = await pickRestaurant(client, lat, lng);
    const menuItem = await pickMenuItem(client, restaurant._id);

    const orderPayload = {
      restaurantId: restaurant._id,
      addressId: address._id,
      paymentMethod: 'cod',
      items: [
        {
          menuItemId: menuItem._id,
          quantity: 1,
        },
      ],
      deliveryInstructions: 'Smoke test order',
    };

    const orderRes = await client.post('/orders', orderPayload);
    const order = orderRes?.data?.data?.order;

    if (!order?._id) {
      fail('Order request completed but no order id was returned.');
    }

    log('SUCCESS');
    log('Address:', address._id, `(${lat}, ${lng})`);
    log('Restaurant:', restaurant._id, restaurant.name || '(unnamed)');
    log('Menu item:', menuItem._id, menuItem.name || '(unnamed)');
    log('Order:', order._id, 'status:', order.status);
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const details = error.response?.data?.errors;

    console.error('[smoke-address-flow] FAILED REQUEST');
    console.error('[smoke-address-flow] Status:', status || 'n/a');
    console.error('[smoke-address-flow] Message:', message);

    if (details) {
      console.error('[smoke-address-flow] Details:', JSON.stringify(details, null, 2));
    }

    process.exit(1);
  }
};

run();
