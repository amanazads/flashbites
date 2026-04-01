import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import {
  autocompleteAddress,
  autocompleteAddressFallback,
  geocodeAddressFallback,
  geocodeAddressQuery
} from '../../api/locationApi';

const PLACES_LIBRARIES = ['places'];

const rawGoogleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY || '';
const GOOGLE_KEY = rawGoogleKey && rawGoogleKey !== 'your_google_maps_api_key' ? rawGoogleKey : '';

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
  const libraries = useMemo(() => PLACES_LIBRARIES, []);
  const { isLoaded } = useJsApiLoader({
    id: 'flashbites-google-map-picker',
    googleMapsApiKey: GOOGLE_KEY || '',
    libraries
  });

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

    // Keep the dropdown visible for typed-address fallback even when
    // remote suggestions are still loading, empty, or fail.
    setShowFallback(true);

    let cancelled = false;
    const timer = setTimeout(async () => {
      setFallbackLoading(true);
      try {
        let response;
        try {
          response = await autocompleteAddress(query);
        } catch {
          response = await autocompleteAddressFallback(query);
        }

        let suggestions = response?.data?.suggestions || response?.suggestions || [];
        if (!cancelled) {
          let nextSuggestions = Array.isArray(suggestions) ? suggestions : [];

          if (nextSuggestions.length === 0) {
            try {
              let geocodeRes;
              try {
                geocodeRes = await geocodeAddressQuery(query);
              } catch {
                geocodeRes = await geocodeAddressFallback(query);
              }
              const location = geocodeRes?.data?.location || geocodeRes?.location || null;
              if (location?.fullAddress) {
                nextSuggestions = [{
                  placeId: `geocode-${query.toLowerCase()}`,
                  label: location.fullAddress,
                  fullAddress: location.fullAddress,
                  city: location.city || '',
                  state: location.state || '',
                  zipCode: location.zipCode || '',
                  street: location.street || '',
                  lat: Number(location.lat),
                  lng: Number(location.lng),
                  source: location.source || 'geocode'
                }];
              }
            } catch {
              // Keep empty suggestions if geocode also fails.
            }
          }

          setFallbackSuggestions(nextSuggestions);
          setShowFallback(true);
        }
      } catch {
        if (!cancelled) {
          setFallbackSuggestions([]);
          setShowFallback(true);
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
    setShowFallback(String(nextValue || '').trim().length >= 3);
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
        let geocodeRes;
        try {
          geocodeRes = await geocodeAddressQuery(formattedAddress);
        } catch {
          geocodeRes = await geocodeAddressFallback(formattedAddress);
        }
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

  const query = String(inputValue || '').trim();

  const fallbackDropdown = showFallback && (
    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-auto">
      {fallbackLoading ? (
        <div className="px-3 py-2 text-xs text-gray-500">Searching addresses...</div>
      ) : (
        <>
          {fallbackSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No address suggestions found.</div>
          ) : fallbackSuggestions.map((suggestion, idx) => (
            <button
              key={`${suggestion.placeId || suggestion.label || 's'}-${idx}`}
              type="button"
              onClick={() => selectFallbackSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="text-sm text-gray-800 truncate">{suggestion.label || suggestion.fullAddress}</div>
            </button>
          ))}
        </>
      )}
    </div>
  );

  const handleInputFocus = () => {
    if (fallbackSuggestions.length > 0 || query.length >= 3) {
      setShowFallback(true);
    }
  };

  const renderPlainInput = (inputPlaceholder) => (
    <div className="relative" ref={fallbackContainerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleLocalChange(e.target.value)}
        onFocus={handleInputFocus}
        placeholder={inputPlaceholder}
        className={className || 'w-full p-3 border rounded-lg'}
      />
      {fallbackDropdown}
    </div>
  );

  if (!GOOGLE_KEY) {
    return renderPlainInput(placeholder);
  }

  if (!isLoaded) {
    return renderPlainInput('Loading address suggestions...');
  }

  return (
    <div className="relative" ref={fallbackContainerRef}>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleLocalChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={className || 'w-full p-3 border rounded-lg'}
        />
      </Autocomplete>
      {fallbackDropdown}
    </div>
  );
}
