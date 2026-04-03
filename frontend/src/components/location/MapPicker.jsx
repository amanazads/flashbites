import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapContainer, Marker as LeafletMarker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const rawGoogleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY || '';
const GOOGLE_KEY = rawGoogleKey && rawGoogleKey !== 'your_google_maps_api_key' ? rawGoogleKey : '';
const MAP_LIBRARIES = ['places'];
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy'
};

const fallbackLeafletIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const LeafletClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

export default function MapPicker({
  onSelect,
  initialPosition = { lat: 31.53, lng: 75.91 },
  mapHeight = 300
}) {
  const defaultCenter = useMemo(() => ({
    lat: Number(initialPosition?.lat) || 31.53,
    lng: Number(initialPosition?.lng) || 75.91
  }), [initialPosition?.lat, initialPosition?.lng]);

  const [position, setPosition] = useState(defaultCenter);

  useEffect(() => {
    setPosition(defaultCenter);
  }, [defaultCenter]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'flashbites-google-map-picker',
    googleMapsApiKey: GOOGLE_KEY || '',
    libraries: MAP_LIBRARIES
  });

  const emitSelection = (nextPosition) => {
    setPosition(nextPosition);
    if (typeof onSelect === 'function') {
      onSelect(nextPosition);
    }
  };

  const renderLeafletFallback = (showError = false) => (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      {showError && (
        <div className="p-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200">
          Google map unavailable. Using fallback map.
        </div>
      )}
      <MapContainer
        center={position}
        zoom={15}
        style={{ width: '100%', height: `${mapHeight}px` }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LeafletClickHandler onMapClick={emitSelection} />
        <LeafletMarker
          position={position}
          draggable
          icon={fallbackLeafletIcon}
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target;
              const latlng = marker.getLatLng();
              emitSelection({ lat: latlng.lat, lng: latlng.lng });
            },
          }}
        />
      </MapContainer>
      <div className="bg-white text-[11px] text-gray-600 px-2 py-1 border-t border-gray-200">
        Tap map or drag pin
      </div>
    </div>
  );

  if (!GOOGLE_KEY) {
    return renderLeafletFallback(false);
  }

  if (loadError) {
    return renderLeafletFallback(true);
  }

  if (!isLoaded) {
    return (
      <div className="w-full rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        center={position}
        zoom={15}
        options={MAP_OPTIONS}
        mapContainerStyle={{ width: '100%', height: `${mapHeight}px` }}
        onClick={(e) => {
          const lat = Number(e.latLng?.lat?.());
          const lng = Number(e.latLng?.lng?.());

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          const nextPosition = { lat, lng };
          emitSelection(nextPosition);
        }}
      >
        <Marker
          position={position}
          draggable
          zIndex={999}
          onDragEnd={(e) => {
            const lat = Number(e.latLng?.lat?.());
            const lng = Number(e.latLng?.lng?.());

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const nextPosition = { lat, lng };
            emitSelection(nextPosition);
          }}
        />
      </GoogleMap>
      <div className="absolute left-2 bottom-2 bg-white/90 text-[11px] text-gray-600 px-2 py-1 rounded-md border border-gray-200 pointer-events-none">
        Tap map or drag pin
      </div>
    </div>
  );
}
