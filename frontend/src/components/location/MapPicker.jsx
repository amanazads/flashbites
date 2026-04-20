import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Capacitor } from '@capacitor/core';

const WEB_GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY;
const NATIVE_GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_NATIVE_API_KEY;
const ALLOW_GOOGLE_MAPS_ON_LOCALHOST = String(import.meta.env.VITE_ALLOW_GOOGLE_MAPS_ON_LOCALHOST || '').toLowerCase() === 'true';
const MAP_LIBRARIES = ['places'];
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy'
};

const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web';
  } catch {
    return Boolean(window?.Capacitor?.isNativePlatform?.());
  }
};

export default function MapPicker({
  onSelect,
  initialPosition = { lat: 31.53, lng: 75.91 },
  mapHeight = 300
}) {
  const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const nativeRuntime = isNativePlatform();
  const nativePreferred = isNativePlatform() && Boolean(NATIVE_GOOGLE_KEY);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(nativePreferred ? NATIVE_GOOGLE_KEY : WEB_GOOGLE_KEY);
  const [loaderAttempt, setLoaderAttempt] = useState(nativePreferred ? 'native' : 'web');
  const shouldUseGoogleMaps = Boolean(googleMapsApiKey) && (nativeRuntime || !isLocalHost || ALLOW_GOOGLE_MAPS_ON_LOCALHOST);
  const defaultCenter = useMemo(() => ({
    lat: Number(initialPosition?.lat) || 31.53,
    lng: Number(initialPosition?.lng) || 75.91
  }), [initialPosition?.lat, initialPosition?.lng]);

  const [position, setPosition] = useState(defaultCenter);
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);

  useEffect(() => {
    setPosition(defaultCenter);
  }, [defaultCenter]);

  useEffect(() => {
    setGoogleMapsApiKey(nativePreferred ? NATIVE_GOOGLE_KEY : WEB_GOOGLE_KEY);
    setLoaderAttempt(nativePreferred ? 'native' : 'web');
  }, [nativePreferred]);

  useEffect(() => {
    if (!shouldUseGoogleMaps || typeof window === 'undefined') return;

    const previousHandler = window.gm_authFailure;
    window.gm_authFailure = () => {
      setGoogleAuthFailed(true);
      if (typeof previousHandler === 'function') {
        previousHandler();
      }
    };

    return () => {
      window.gm_authFailure = previousHandler;
    };
  }, [shouldUseGoogleMaps]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: `flashbites-google-map-picker-${loaderAttempt}`,
    googleMapsApiKey: shouldUseGoogleMaps ? googleMapsApiKey : '',
    libraries: MAP_LIBRARIES
  });

  useEffect(() => {
    if (!nativePreferred) return;
    if (isLoaded || loadError) return;

    const timeout = window.setTimeout(() => {
      setGoogleMapsApiKey(WEB_GOOGLE_KEY);
      setLoaderAttempt('web-fallback');
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [isLoaded, loadError, nativePreferred]);

  const emitSelection = (nextPosition) => {
    setPosition(nextPosition);
    if (typeof onSelect === 'function') {
      onSelect(nextPosition);
    }
  };

  if (!shouldUseGoogleMaps) {
    return (
      <div className="w-full rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
        Loading map...
      </div>
    );
  }

  if (googleAuthFailed || loadError) {
    return (
      <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Google Maps could not be loaded. Verify API key restrictions, billing, and that Maps JavaScript API + Places API are enabled.
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
