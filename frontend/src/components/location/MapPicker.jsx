import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY;
const MAP_LIBRARIES = ['places'];
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy'
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

  if (!GOOGLE_KEY) {
    return (
      <div className="w-full rounded-lg border border-dashed border-gray-300 p-4 text-xs text-gray-500">
        Google Maps key missing. You can still enter coordinates manually.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
        Unable to load map right now. Please type your address and use suggestions.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
        Loading map...
      </div>
    );
  }

  return (
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
        setPosition(nextPosition);

        if (typeof onSelect === 'function') {
          onSelect(nextPosition);
        }
      }}
    >
      <Marker position={position} />
    </GoogleMap>
  );
}
