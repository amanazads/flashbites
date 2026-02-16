import { useEffect, useRef, useState } from 'react';
import { updateDeliveryLocation } from '../api/deliveryPartnerApi';
import toast from 'react-hot-toast';

/**
 * Custom hook to track and send delivery partner's location
 * @param {string} orderId - The active order ID (null if no active order)
 * @param {boolean} isEnabled - Whether location tracking is enabled
 * @param {number} interval - Update interval in milliseconds (default: 10000 = 10 seconds)
 */
export const useLocationTracking = (orderId, isEnabled = true, interval = 10000) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);
  const intervalIdRef = useRef(null);

  // Send location to backend
  const sendLocation = async (latitude, longitude) => {
    try {
      await updateDeliveryLocation(latitude, longitude, orderId);
      console.log('Location updated:', { latitude, longitude, orderId });
    } catch (err) {
      console.error('Failed to update location:', err);
      // Don't show toast for every failed update to avoid spam
    }
  };

  useEffect(() => {
    if (!isEnabled || !orderId) {
      // Stop tracking if disabled or no active order
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('Geolocation not supported');
      return;
    }

    setIsTracking(true);

    // Success callback
    const onSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ latitude, longitude });
      setError(null);
    };

    // Error callback
    const onError = (err) => {
      let errorMessage = 'Failed to get location';
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timeout';
          break;
        default:
          errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Geolocation error:', errorMessage);
    };

    // Watch position for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Set up interval to send location updates
    intervalIdRef.current = setInterval(() => {
      if (currentLocation) {
        sendLocation(currentLocation.latitude, currentLocation.longitude);
      }
    }, interval);

    // Initial location send
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendLocation(latitude, longitude);
      },
      (err) => console.error('Initial location fetch failed:', err)
    );

    // Cleanup
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [orderId, isEnabled, interval]);

  // Send location whenever currentLocation changes
  useEffect(() => {
    if (currentLocation && orderId && isEnabled) {
      sendLocation(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation, orderId, isEnabled]);

  return {
    currentLocation,
    error,
    isTracking
  };
};
