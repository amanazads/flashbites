import React, { useEffect, useRef, useState } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_KEY;

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
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

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
  };

  if (!GOOGLE_KEY) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={placeholder}
        className={className || 'w-full p-3 border rounded-lg'}
      />
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_KEY} libraries={libraries}>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder={placeholder}
          className={className || 'w-full p-3 border rounded-lg'}
        />
      </Autocomplete>
    </LoadScript>
  );
}
