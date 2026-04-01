import React, { useEffect, useState } from 'react';
import { ChevronDownIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  DELIVERY_LOCATION_UPDATED_EVENT,
  getStoredDeliveryLocation,
  persistDeliveryLocation,
  requestCurrentPosition,
  reverseGeocode,
} from '../../utils/location';

const BRAND = '#FF523B';

const AuthLocationBar = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const syncLocation = (event) => {
      if (event.type === 'storage') {
        setSelectedLocation(getStoredDeliveryLocation());
        return;
      }
      setSelectedLocation(event.detail || getStoredDeliveryLocation());
    };

    setSelectedLocation(getStoredDeliveryLocation());
    window.addEventListener(DELIVERY_LOCATION_UPDATED_EVENT, syncLocation);
    window.addEventListener('storage', syncLocation);
    return () => {
      window.removeEventListener(DELIVERY_LOCATION_UPDATED_EVENT, syncLocation);
      window.removeEventListener('storage', syncLocation);
    };
  }, []);

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const pos = await requestCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const locationDetails = await reverseGeocode(latitude, longitude);
      const nextLocation = {
        label: locationDetails?.displayName?.split(',').slice(0, 2).join(', ') || 'Current Location',
        street: locationDetails?.street || '',
        city: locationDetails?.city || '',
        state: locationDetails?.state || '',
        zipCode: locationDetails?.zipCode || '',
        latitude,
        longitude,
        fromGps: true,
      };

      persistDeliveryLocation(nextLocation);
      setShowPicker(false);
      toast.success(`Location detected: ${nextLocation.city || 'current location'}`);
    } catch {
      toast.error('Could not detect your location');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="mb-6 relative">
      <button
        type="button"
        onClick={() => setShowPicker((prev) => !prev)}
        className="w-full flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5 text-left border border-gray-100"
      >
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <MapPinIcon className="w-5 h-5" style={{ color: BRAND }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Location</p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {selectedLocation?.label || 'Select your delivery location'}
          </p>
        </div>
        {selectedLocation ? (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              persistDeliveryLocation(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                persistDeliveryLocation(null);
              }
            }}
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0"
            aria-label="Clear location"
          >
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </div>
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {showPicker && (
        <div className="absolute left-0 right-0 top-full mt-2 z-20 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            {locating ? 'Detecting location...' : 'Use current location'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthLocationBar;
