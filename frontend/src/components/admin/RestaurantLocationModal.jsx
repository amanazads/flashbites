import React, { useEffect, useMemo, useState } from 'react';
import { DrawingManager, GoogleMap, Marker, Polygon, useJsApiLoader } from '@react-google-maps/api';

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY;
const MAP_LIBRARIES = ['drawing'];

const normalizeZonePath = (zone) => {
  const ring = Array.isArray(zone?.coordinates?.[0]) ? zone.coordinates[0] : [];
  return ring
    .map((point) => ({ lat: Number(point?.[1]), lng: Number(point?.[0]) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
};

const RestaurantLocationModal = ({ restaurant, onClose, onSave, saving }) => {
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('');
  const [zonePath, setZonePath] = useState([]);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '' });

  const mapCenter = useMemo(() => ({
    lat: toNumber(lat) || 31.53,
    lng: toNumber(lng) || 75.91
  }), [lat, lng]);

  const { isLoaded } = useJsApiLoader({
    id: 'flashbites-admin-zone-drawing',
    googleMapsApiKey: GOOGLE_KEY || '',
    libraries: MAP_LIBRARIES,
  });

  useEffect(() => {
    if (!restaurant) return;
    const coords = restaurant.location?.coordinates || [];
    setLng(Number(coords[0]));
    setLat(Number(coords[1]));
    setDeliveryRadiusKm(restaurant.deliveryRadiusKm ?? '');
    setPrepTimeMinutes(restaurant.prepTimeMinutes ?? 20);
    setZonePath(normalizeZonePath(restaurant.deliveryZone));
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
    const nextPrepTime = toNumber(prepTimeMinutes);

    const payload = {
      deliveryRadiusKm: nextRadius != null ? nextRadius : undefined,
      prepTimeMinutes: nextPrepTime != null ? nextPrepTime : undefined,
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

    if (zonePath.length >= 3) {
      const rawPath = zonePath.map((p) => [p.lng, p.lat]);
      const first = rawPath[0];
      const last = rawPath[rawPath.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        rawPath.push([...first]);
      }
      payload.deliveryZone = { type: 'Polygon', coordinates: [rawPath] };
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

            <label className="block text-xs font-semibold text-gray-500">Prep Time (minutes)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(e.target.value)}
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
            <p className="text-xs font-semibold text-gray-500">Map Picker + Delivery Zone</p>
            {!GOOGLE_KEY || !isLoaded ? (
              <div className="w-full rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
                Google Maps key missing or still loading. You can still save lat/lng and text address fields.
              </div>
            ) : (
              <GoogleMap
                center={mapCenter}
                zoom={14}
                mapContainerStyle={{ width: '100%', height: '320px', borderRadius: '12px' }}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                onClick={(e) => {
                  const nextLat = Number(e.latLng?.lat?.());
                  const nextLng = Number(e.latLng?.lng?.());
                  if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
                  setLat(nextLat.toFixed(6));
                  setLng(nextLng.toFixed(6));
                }}
              >
                <Marker
                  position={mapCenter}
                  draggable
                  onDragEnd={(e) => {
                    const nextLat = Number(e.latLng?.lat?.());
                    const nextLng = Number(e.latLng?.lng?.());
                    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
                    setLat(nextLat.toFixed(6));
                    setLng(nextLng.toFixed(6));
                  }}
                />

                {zonePath.length >= 3 && (
                  <Polygon
                    path={zonePath}
                    options={{
                      fillColor: '#EA580C',
                      fillOpacity: 0.2,
                      strokeColor: '#EA580C',
                      strokeOpacity: 1,
                      strokeWeight: 2,
                      clickable: false,
                      editable: false,
                      draggable: false,
                    }}
                  />
                )}

                <DrawingManager
                  options={{
                    drawingControl: true,
                    drawingControlOptions: {
                      position: window.google.maps.ControlPosition.TOP_CENTER,
                      drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
                    },
                    polygonOptions: {
                      fillColor: '#EA580C',
                      fillOpacity: 0.2,
                      strokeColor: '#EA580C',
                      strokeWeight: 2,
                      clickable: false,
                      editable: true,
                      draggable: false,
                    },
                  }}
                  onPolygonComplete={(polygon) => {
                    const path = polygon.getPath().getArray().map((p) => ({
                      lat: Number(p.lat()),
                      lng: Number(p.lng()),
                    }));
                    setZonePath(path);
                    polygon.setMap(null);
                  }}
                />
              </GoogleMap>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Draw polygon to define delivery zone. Radius is used only when no zone exists.</p>
              {zonePath.length >= 3 && (
                <button
                  type="button"
                  onClick={() => setZonePath([])}
                  className="text-xs font-semibold text-red-600"
                >
                  Clear Zone
                </button>
              )}
            </div>
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
