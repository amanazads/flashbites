import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback((options = {}) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setLoading(true);
    setError(null);

    const defaultOptions = {
      enableHighAccuracy: false, // Changed to false by default to avoid GPS lock issues
      timeout: 10000, // 10 seconds
      maximumAge: 600000, // 10 minutes cache
      ...options
    };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocation(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (err) => {
          let errorMessage = 'Unable to get your location';
          
          switch(err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please select a location manually.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out. Please select a location manually.';
              break;
            default:
              errorMessage = 'Unable to determine location. Please select manually.';
          }
          
          setError(errorMessage);
          setLoading(false);
          reject(err);
        },
        defaultOptions
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return { location, error, loading, getLocation, clearLocation };
};