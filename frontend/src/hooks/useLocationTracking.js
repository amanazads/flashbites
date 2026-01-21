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
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'granted', 'denied', 'prompt'
  const watchIdRef = useRef(null);
  const intervalIdRef = useRef(null);
  const lastErrorRef = useRef(null);
  const errorToastShownRef = useRef(false);

  // Send location to backend
  const sendLocation = async (latitude, longitude) => {
    if (!orderId) {
      console.log('⚠️ Skipping location update - no active order');
      return;
    }
    try {
      await updateDeliveryLocation(latitude, longitude, orderId);
      console.log('📍 Location sent to server:', { latitude, longitude, orderId });
    } catch (err) {
      console.error('❌ Failed to update location:', err);
      // Don't show toast for every failed update to avoid spam
    }
  };

  // Check geolocation permission status
  const checkPermission = async () => {
    if (!navigator.permissions) {
      console.warn('Permissions API not supported');
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(result.state);
      
      result.addEventListener('change', () => {
        setPermissionStatus(result.state);
        if (result.state === 'granted') {
          errorToastShownRef.current = false;
          setError(null);
        }
      });
    } catch (err) {
      console.warn('Could not check geolocation permission:', err);
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    // Clear any existing tracking
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (!isEnabled || !orderId) {
      setIsTracking(false);
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setError(errorMsg);
      if (!errorToastShownRef.current) {
        toast.error(errorMsg);
        errorToastShownRef.current = true;
      }
      return;
    }

    // If permission is denied, show error and don't attempt tracking
    if (permissionStatus === 'denied') {
      const errorMsg = 'Location permission denied. Please enable location access in your browser settings.';
      setError(errorMsg);
      if (!errorToastShownRef.current) {
        toast.error(errorMsg, { duration: 5000 });
        errorToastShownRef.current = true;
      }
      return;
    }

    setIsTracking(true);
    console.log('🎯 Starting location tracking for order:', orderId);

    // Success callback
    const onSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      setCurrentLocation({ latitude, longitude, accuracy });
      setError(null);
      errorToastShownRef.current = false;
      lastErrorRef.current = null;
      console.log('✅ Location obtained:', { latitude, longitude, accuracy: `${accuracy}m` });
    };

    // Error callback
    const onError = (err) => {
      let errorMessage = 'Failed to get location';
      let shouldShowToast = false;
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Enable location in browser settings.';
          shouldShowToast = true;
          setPermissionStatus('denied');
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location currently unavailable. GPS signal may be weak.';
          // Only show toast if this is a new error - don't spam
          shouldShowToast = false; // Changed to never show toast for this
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out. Retrying...';
          // Don't show toast for timeout, just log it
          shouldShowToast = false;
          break;
        default:
          errorMessage = err.message || 'Unknown location error';
          shouldShowToast = true;
      }
      
      setError(errorMessage);
      
      // Only log position unavailable and timeout as debug info, not warnings
      if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
        console.log('ℹ️ Location update:', errorMessage);
      } else {
        console.warn('⚠️ Geolocation error:', errorMessage, 'Code:', err.code);
      }
      
      // Only show toast for critical errors and if not shown recently
      if (shouldShowToast && !errorToastShownRef.current) {
        toast.error(errorMessage, { duration: 5000 });
        errorToastShownRef.current = true;
        setTimeout(() => { errorToastShownRef.current = false; }, 30000); // Reset after 30s
      }
      
      lastErrorRef.current = err.code === err.PERMISSION_DENIED ? 'PERMISSION_DENIED' :
                             err.code === err.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE' :
                             err.code === err.TIMEOUT ? 'TIMEOUT' : 'UNKNOWN';
    };

    // Options for geolocation
    const geoOptions = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 30000, // Increased timeout to 30 seconds
      maximumAge: 10000 // Accept cached position up to 10 seconds old
    };

    // Try to get initial location first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        sendLocation(latitude, longitude);
        console.log('📍 Initial location obtained:', { latitude, longitude });
      },
      (err) => {
        // Silent failure - watchPosition will handle continuous tracking
        if (err.code !== 2) { // Only log if not POSITION_UNAVAILABLE
          console.log('ℹ️ Initial location fetch skipped, using continuous tracking');
        }
      },
      geoOptions
    );

    // Watch position for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      geoOptions
    );

    // Set up interval to send location updates
    intervalIdRef.current = setInterval(() => {
      if (currentLocation) {
        sendLocation(currentLocation.latitude, currentLocation.longitude);
      }
    }, interval);

    // Cleanup
    return () => {
      console.log('🛑 Stopping location tracking');
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [orderId, isEnabled, interval, permissionStatus]);

  return {
    currentLocation,
    error,
    isTracking,
    permissionStatus
  };
};
