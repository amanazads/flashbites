import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Capacitor } from '@capacitor/core';

const PLACES_LIBRARIES = ['places'];

const WEB_GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY;
const NATIVE_GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_NATIVE_API_KEY;
const ALLOW_GOOGLE_MAPS_ON_LOCALHOST = String(import.meta.env.VITE_ALLOW_GOOGLE_MAPS_ON_LOCALHOST || '').toLowerCase() === 'true';

const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web';
  } catch {
    return Boolean(window?.Capacitor?.isNativePlatform?.());
  }
};

const parseAddressComponents = (components = []) => {
  const getByType = (type) =>
    components.find((item) => item.types?.includes(type))?.longText ||
    components.find((item) => item.types?.includes(type))?.long_name ||
    components.find((item) => item.types?.includes(type))?.shortText ||
    '';

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
  const containerRef = useRef(null);
  const placesLibraryRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const [inputValue, setInputValue] = useState(value);
  const nativePreferred = isNativePlatform() && Boolean(NATIVE_GOOGLE_KEY);
  const nativeRuntime = isNativePlatform();
  const [loaderAttempt, setLoaderAttempt] = useState(nativePreferred ? 'native' : 'web');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(nativePreferred ? NATIVE_GOOGLE_KEY : WEB_GOOGLE_KEY);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);
  const [placesLibraryReady, setPlacesLibraryReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const shouldUseGoogleMaps = Boolean(googleMapsApiKey) && (nativeRuntime || !isLocalHost || ALLOW_GOOGLE_MAPS_ON_LOCALHOST);
  const libraries = useMemo(() => PLACES_LIBRARIES, []);
  const { isLoaded } = useJsApiLoader({
    id: `flashbites-google-map-picker-${loaderAttempt}`,
    googleMapsApiKey: shouldUseGoogleMaps ? googleMapsApiKey : '',
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
    if (!isLoaded || typeof window === 'undefined' || !window?.google?.maps?.importLibrary) return;

    let isActive = true;

    (async () => {
      try {
        const placesLibrary = await window.google.maps.importLibrary('places');
        if (!isActive) return;

        placesLibraryRef.current = placesLibrary;
        sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
        setPlacesLibraryReady(true);
      } catch {
        if (!isActive) return;

        placesLibraryRef.current = null;
        sessionTokenRef.current = null;
        setPlacesLibraryReady(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isLoaded]);

  useEffect(() => {
    setGoogleMapsApiKey(nativePreferred ? NATIVE_GOOGLE_KEY : WEB_GOOGLE_KEY);
    setLoaderAttempt(nativePreferred ? 'native' : 'web');
  }, [nativePreferred]);

  useEffect(() => {
    const closeOnOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!shouldUseGoogleMaps || googleAuthFailed || !isLoaded || !placesLibraryReady || !placesLibraryRef.current?.AutocompleteSuggestion) return;

    const query = String(inputValue || '').trim();
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const { suggestions: nextSuggestions = [] } = await placesLibraryRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current
        });

        if (cancelled) return;

        setSuggestions(nextSuggestions);
        setShowSuggestions(nextSuggestions.length > 0);
        setActiveIndex(-1);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setShowSuggestions(false);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [googleAuthFailed, inputValue, isLoaded, placesLibraryReady, shouldUseGoogleMaps]);

  useEffect(() => {
    if (!nativePreferred) return;
    if (isLoaded) return;

    const timeout = window.setTimeout(() => {
      setGoogleMapsApiKey(WEB_GOOGLE_KEY);
      setLoaderAttempt('web-fallback');
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [isLoaded, nativePreferred]);

  const handleLocalChange = (nextValue) => {
    setInputValue(nextValue);
    if (!String(nextValue || '').trim() && placesLibraryReady && placesLibraryRef.current?.AutocompleteSessionToken) {
      sessionTokenRef.current = new placesLibraryRef.current.AutocompleteSessionToken();
    }
    if (typeof onChange === 'function') {
      onChange(nextValue);
    }
  };

  const selectSuggestion = async (suggestion) => {
    const placePrediction = suggestion?.placePrediction;
    if (!placePrediction) {
      return;
    }

    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['formattedAddress', 'location', 'addressComponents']
      });

      const formattedAddress = place.formattedAddress || placePrediction.text?.text || inputValue;
      const lat = Number(place.location?.lat?.() ?? place.location?.lat);
      const lng = Number(place.location?.lng?.() ?? place.location?.lng);

      handleLocalChange(formattedAddress);
      setShowSuggestions(false);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const parsed = parseAddressComponents(place.addressComponents || []);

      if (typeof onSelect === 'function') {
        onSelect({
          address: formattedAddress,
          fullAddress: formattedAddress,
          lat,
          lng,
          ...parsed
        });
      }

      if (placesLibraryReady && placesLibraryRef.current?.AutocompleteSessionToken) {
        sessionTokenRef.current = new placesLibraryRef.current.AutocompleteSessionToken();
      }
    } catch {
      setShowSuggestions(false);
    }
  };

  const suggestionsDropdown = showSuggestions && (
    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-auto">
      {suggestionsLoading ? (
        <div className="px-3 py-2 text-xs text-gray-500">Searching addresses...</div>
      ) : suggestions.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-500">No suggestions found.</div>
      ) : (
        suggestions.map((suggestion, idx) => {
          const placePrediction = suggestion.placePrediction;
          const primaryText = placePrediction?.text?.text || placePrediction?.mainText?.text || suggestion.description || '';
          const secondaryText = placePrediction?.secondaryText?.text || '';

          return (
            <button
              key={`${placePrediction?.placeId || primaryText || 's'}-${idx}`}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 ${activeIndex === idx ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
            >
              <div className="text-sm text-gray-800 truncate">{primaryText}</div>
              {secondaryText ? <div className="text-[11px] text-gray-500 truncate">{secondaryText}</div> : null}
            </button>
          );
        })
      )}
    </div>
  );

  if (!shouldUseGoogleMaps || googleAuthFailed) {
    return (
      <div className="relative" ref={containerRef}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleLocalChange(e.target.value)}
          onFocus={() => setShowSuggestions(suggestions.length > 0 || String(inputValue || '').trim().length >= 3)}
          placeholder={placeholder}
          className={className || 'w-full p-3 border rounded-lg'}
        />
        {suggestionsDropdown}
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
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleLocalChange(e.target.value)}
        onFocus={() => setShowSuggestions(suggestions.length > 0)}
        onKeyDown={(e) => {
          if (!showSuggestions || suggestions.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
          } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
              e.preventDefault();
              selectSuggestion(suggestions[activeIndex]);
            }
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
        placeholder={placeholder}
        className={className || 'w-full p-3 border rounded-lg'}
      />
      {suggestionsDropdown}
    </div>
  );
}
