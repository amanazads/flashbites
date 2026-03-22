import React, { useEffect, useState } from 'react';
import MapPicker from './MapPicker';

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const RestaurantLocationModal = ({ restaurant, onClose, onSave, saving }) => {
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '' });

  useEffect(() => {
    if (!restaurant) return;
    const coords = restaurant.location?.coordinates || [];
    setLng(Number(coords[0]));
    setLat(Number(coords[1]));
    setDeliveryRadiusKm(restaurant.deliveryRadiusKm ?? '');
    setAddress({
      street: restaurant.address?.street || '',
      city: restaurant.address?.city || '',
      state: restaurant.address?.state || '',
      zipCode: restaurant.address?.zipCode || ''
    });
  }, [restaurant]);

  if (!restaurant) return null;

  const handleSave = () => {
    const nextLat = toNumber(lat);
    const nextLng = toNumber(lng);
    const nextRadius = toNumber(deliveryRadiusKm);

    const payload = {
      deliveryRadiusKm: nextRadius != null ? nextRadius : undefined,
      address: {
        street: address.street || undefined,
        city: address.city || undefined,
        state: address.state || undefined,
        zipCode: address.zipCode || undefined
      }
    };

    if (nextLat != null && nextLng != null) {
      payload.location = {
        type: 'Point',
        coordinates: [nextLng, nextLat]
      };
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Edit Location</p>
            <h3 className="text-lg font-bold text-gray-900">{restaurant.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-500">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={lat ?? ''}
              onChange={(e) => setLat(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />

            <label className="block text-xs font-semibold text-gray-500">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={lng ?? ''}
              onChange={(e) => setLng(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />

            <label className="block text-xs font-semibold text-gray-500">Delivery Radius (km)</label>
            <input
              type="number"
              min="1"
              value={deliveryRadiusKm}
              onChange={(e) => setDeliveryRadiusKm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500">Street</label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500">City</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500">State</label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500">Zip</label>
                <input
                  type="text"
                  value={address.zipCode}
                  onChange={(e) => setAddress((prev) => ({ ...prev, zipCode: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">Map Picker</p>
            <MapPicker
              lat={toNumber(lat)}
              lng={toNumber(lng)}
              onChange={(point) => {
                setLat(point.lat.toFixed(6));
                setLng(point.lng.toFixed(6));
              }}
            />
            <p className="text-xs text-gray-400">Click the map or drag the marker to set coordinates.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantLocationModal;
