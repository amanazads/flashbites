import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { autocompleteAddress, geocodeAddressQuery } from '../../api/locationApi';

const PLACES_LIBRARIES = ['places'];

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY;
const ALLOW_GOOGLE_MAPS_ON_LOCALHOST = String(import.meta.env.VITE_ALLOW_GOOGLE_MAPS_ON_LOCALHOST || '').toLowerCase() === 'true';

const parseAddressComponents = (components = []) => {
  const getByType = (type) => components.find((item) => item.types?.includes(type))?.long_name || '';

  const streetNumber = getByType('street_number');
  const route = getByType('route');

  return {
    street: [streetNumber, route].filter(Boolean).join(' ').trim(),
    city: getByType('locality') || getByType('administrative_area_level_2') || getByType('sublocality') || '',
    state: getByType('administrative_area_level_1') || '',
    zipCode: getByType('postal_code') || ''
  };
};

export default function AddressInput({ value = '', onChange, onSelect, placeholder = 'Enter delivery address', className = '' }) {
  const autocompleteRef = useRef(null);
  const fallbackContainerRef = useRef(null);
  const [inputValue, setInputValue] = useState(value);
  const [fallbackSuggestions, setFallbackSuggestions] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);
  const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const shouldUseGoogleMaps = Boolean(GOOGLE_KEY) && (!isLocalHost || ALLOW_GOOGLE_MAPS_ON_LOCALHOST);
  const libraries = useMemo(() => PLACES_LIBRARIES, []);
  const { isLoaded } = useJsApiLoader({
    id: 'flashbites-google-map-picker',
    googleMapsApiKey: shouldUseGoogleMaps ? GOOGLE_KEY : '',
    libraries
  });

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

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    return () => {
      if (typeof document === 'undefined') return;

      document.querySelectorAll('.pac-container').forEach((node) => {
        if (!node.children.length) {
          node.remove();
        }
      });
    };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (e) => {
      if (fallbackContainerRef.current && !fallbackContainerRef.current.contains(e.target)) {
        setShowFallback(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    // Always load backend suggestions as a resilient fallback.
    const query = String(inputValue || '').trim();
    if (query.length < 3) {
      setFallbackSuggestions([]);
      setShowFallback(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setFallbackLoading(true);
      try {
        const response = await autocompleteAddress(query);
        const suggestions = response?.data?.suggestions || response?.suggestions || [];
        if (!cancelled) {
          setFallbackSuggestions(Array.isArray(suggestions) ? suggestions : []);
          setShowFallback(Array.isArray(suggestions) && suggestions.length > 0);
        }
      } catch {
        if (!cancelled) {
          setFallbackSuggestions([]);
          setShowFallback(false);
        }
      } finally {
        if (!cancelled) setFallbackLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue]);

  const handleLocalChange = (nextValue) => {
    setInputValue(nextValue);
    if (typeof onChange === 'function') {
      onChange(nextValue);
    }
  };

  const onLoad = (auto) => {
    autocompleteRef.current = auto;
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace?.();
    if (!place) return;

    const formattedAddress = place.formatted_address || inputValue;
    handleLocalChange(formattedAddress);

    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const parsed = parseAddressComponents(place.address_components || []);

    if (typeof onSelect === 'function') {
      onSelect({
        address: formattedAddress,
        fullAddress: formattedAddress,
        lat,
        lng,
        ...parsed
      });
    }

    setShowFallback(false);
  };

  const selectFallbackSuggestion = async (suggestion) => {
    const formattedAddress = suggestion?.fullAddress || suggestion?.label || inputValue;
    const lat = Number(suggestion?.lat);
    const lng = Number(suggestion?.lng);

    let resolved = {
      fullAddress: formattedAddress,
      address: formattedAddress,
      city: suggestion?.city || '',
      state: suggestion?.state || '',
      zipCode: suggestion?.zipCode || '',
      street: suggestion?.street || '',
      lat,
      lng,
    };

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      try {
        const geocodeRes = await geocodeAddressQuery(formattedAddress);
        const loc = geocodeRes?.data?.location || geocodeRes?.location || null;
        if (loc) {
          resolved = {
            ...resolved,
            fullAddress: loc.fullAddress || formattedAddress,
            address: loc.fullAddress || formattedAddress,
            city: loc.city || resolved.city,
            state: loc.state || resolved.state,
            zipCode: loc.zipCode || resolved.zipCode,
            street: loc.street || resolved.street,
            lat: Number(loc.lat),
            lng: Number(loc.lng),
          };
        }
      } catch {
        // Keep text-only selection if geocode lookup fails.
      }
    }

    handleLocalChange(resolved.fullAddress || formattedAddress);
    setShowFallback(false);
    if (typeof onSelect === 'function') onSelect(resolved);
  };

  const fallbackDropdown = showFallback && (
    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-auto">
      {fallbackLoading ? (
        <div className="px-3 py-2 text-xs text-gray-500">Searching addresses...</div>
      ) : fallbackSuggestions.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-500">No suggestions found.</div>
      ) : (
        fallbackSuggestions.map((suggestion, idx) => (
          <button
            key={`${suggestion.placeId || suggestion.label || 's'}-${idx}`}
            type="button"
            onClick={() => selectFallbackSuggestion(suggestion)}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
          >
            <div className="text-sm text-gray-800 truncate">{suggestion.label || suggestion.fullAddress}</div>
          </button>
        ))
      )}
    </div>
  );

  if (!shouldUseGoogleMaps || googleAuthFailed) {
    return (
      <div className="relative" ref={fallbackContainerRef}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleLocalChange(e.target.value)}
          onFocus={() => setShowFallback(fallbackSuggestions.length > 0)}
          placeholder={placeholder}
          className={className || 'w-full p-3 border rounded-lg'}
        />
        {fallbackDropdown}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder="Loading address suggestions..."
        className={className || 'w-full p-3 border rounded-lg'}
      />
    );
  }

  return (
    <div className="relative" ref={fallbackContainerRef}>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleLocalChange(e.target.value)}
          onFocus={() => setShowFallback(fallbackSuggestions.length > 0)}
          placeholder={placeholder}
          className={className || 'w-full p-3 border rounded-lg'}
        />
      </Autocomplete>
      {fallbackDropdown}
    </div>
  );
}
