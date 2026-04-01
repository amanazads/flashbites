import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { getAddresses } from '../../api/userApi';
import {
  createDeliveryLocation,
  formatLocationLabel,
  geocodeAddress,
  hasValidCoordinates,
  lookupIndianPincode,
  persistDeliveryLocation,
  requestCurrentPosition,
  resolveAddressCoordinates,
  reverseGeocode,
} from '../../utils/location';

const BRAND = '#E23744';

const LocationSelectionModal = ({ isOpen, isAuthenticated, onClose, requireSelection = false }) => {
  const [locating, setLocating] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    let active = true;
    const loadAddresses = async () => {
      setLoadingSavedAddresses(true);
      try {
        const response = await getAddresses();
        if (!active) return;
        setSavedAddresses(response?.data?.addresses || []);
      } catch {
        if (!active) return;
        setSavedAddresses([]);
      } finally {
        if (active) setLoadingSavedAddresses(false);
      }
    };

    loadAddresses();
    return () => {
      active = false;
    };
  }, [isAuthenticated, isOpen]);

  const savedAddressCards = useMemo(
    () =>
      savedAddresses.map((address) => ({
        ...address,
        title: `${address.type?.charAt(0)?.toUpperCase() || 'A'}${address.type?.slice(1) || 'ddress'}${address.city ? ` · ${address.city}` : ''}`,
        subtitle: formatLocationLabel(address),
      })),
    [savedAddresses]
  );

  if (!isOpen) return null;

  const handleLocationSelected = (location) => {
    persistDeliveryLocation(location);
    setManualQuery('');
    onClose?.();
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const pos = await requestCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const details = await reverseGeocode(latitude, longitude);

      handleLocationSelected(
        createDeliveryLocation(
          {
            ...details,
            latitude,
            longitude,
          },
          {
            fromGps: true,
            label: details?.displayName?.split(',').slice(0, 2).join(', ') || 'Current location',
          }
        )
      );
      toast.success(`Location set to ${details?.city || 'your current area'}`);
    } catch (error) {
      toast.error(
        error?.code === 1
          ? 'Location permission denied. Enter your delivery area manually.'
          : 'Could not detect your location'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    const query = manualQuery.trim();

    if (!query) {
      toast.error('Enter your delivery address, area, city, or PIN code');
      return;
    }

    setManualLoading(true);
    try {
      let resolvedLocation = null;

      if (/^\d{6}$/.test(query)) {
        const pincode = await lookupIndianPincode(query);
        if (pincode) {
          const geocoded = await geocodeAddress(
            [pincode.officeName, pincode.city, pincode.state, pincode.zipCode, 'India'].filter(Boolean).join(', ')
          );
          if (geocoded) {
            resolvedLocation = createDeliveryLocation(
              {
                street: pincode.officeName || '',
                city: geocoded.city || pincode.city,
                state: geocoded.state || pincode.state,
                zipCode: geocoded.zipCode || pincode.zipCode,
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
              },
              {
                label: `${pincode.officeName || pincode.city}, ${pincode.city}`,
                fromManualEntry: true,
              }
            );
          }
        }
      }

      if (!resolvedLocation) {
        const geocoded = await geocodeAddress(query);
        if (geocoded) {
          resolvedLocation = createDeliveryLocation(
            {
              street: query,
              city: geocoded.city,
              state: geocoded.state,
              zipCode: geocoded.zipCode,
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
            },
            {
              label: geocoded.displayName?.split(',').slice(0, 2).join(', ') || query,
              fromManualEntry: true,
            }
          );
        }
      }

      if (!resolvedLocation) {
        toast.error('We could not verify that location yet. Try a nearby area, city, or PIN code.');
        return;
      }

      handleLocationSelected(resolvedLocation);
      toast.success(`Delivery location set to ${resolvedLocation.city || resolvedLocation.label}`);
    } finally {
      setManualLoading(false);
    }
  };

  const handleSavedAddressSelect = async (address) => {
    setManualLoading(true);
    try {
      const coords = hasValidCoordinates(address)
        ? { latitude: Number(address.location.coordinates[1]), longitude: Number(address.location.coordinates[0]) }
        : await resolveAddressCoordinates(address);

      if (!coords) {
        toast.error('We could not verify this saved address for delivery');
        return;
      }

      handleLocationSelected(
        createDeliveryLocation(
          {
            ...address,
            ...coords,
          },
          {
            fromSavedAddress: true,
            label: formatLocationLabel(address),
          }
        )
      );
      toast.success(`Delivery location set to ${address.city || address.zipCode}`);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 px-4 py-6 sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-gray-100 bg-[linear-gradient(135deg,#1c1c1c_0%,#4b171b_100%)] px-6 py-6 text-white sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/60">FlashBites Delivery Zone</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Choose your location first</h2>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            We&apos;ll show only restaurants that can deliver to your selected area. If nothing is available yet, you&apos;ll see a coming soon message for that location.
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating || manualLoading}
              className="flex items-start gap-4 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-left transition hover:border-red-200 hover:bg-red-100 disabled:opacity-60"
            >
              <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                <MapPinIcon className="h-6 w-6" style={{ color: BRAND }} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900">{locating ? 'Detecting your location...' : 'Use current location'}</p>
                <p className="mt-1 text-sm text-gray-500">Best for finding restaurants around you instantly.</p>
              </div>
            </button>

            <div className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-5">
              <div className="flex items-start gap-3">
                <ExclamationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">No service at your location?</p>
                  <p className="mt-1 text-sm text-gray-500">We&apos;ll show a clear &quot;Coming Soon to your area&quot; message instead of unavailable restaurants.</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900" htmlFor="delivery-location-search">
              Delivery address, area, city, or PIN code
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="delivery-location-search"
                  type="text"
                  value={manualQuery}
                  onChange={(event) => setManualQuery(event.target.value)}
                  placeholder="Example: Indiranagar, Bengaluru or 560038"
                  className="w-full rounded-2xl border border-gray-200 px-12 py-3.5 text-sm font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                />
              </div>
              <button
                type="submit"
                disabled={manualLoading || locating}
                className="rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #E23744, #C92535)' }}
              >
                {manualLoading ? 'Checking area...' : 'Confirm location'}
              </button>
            </div>
          </form>

          {isAuthenticated && (
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">Saved delivery addresses</p>
                  <p className="text-xs text-gray-500">Pick one to start browsing restaurants for that location.</p>
                </div>
                <Link to="/profile" className="text-xs font-bold" style={{ color: BRAND }}>
                  Manage addresses
                </Link>
              </div>

              {loadingSavedAddresses ? (
                <p className="text-sm text-gray-500">Loading saved addresses...</p>
              ) : savedAddressCards.length === 0 ? (
                <p className="text-sm text-gray-500">No saved addresses yet. You can still use your current location or enter an area manually.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedAddressCards.map((address) => (
                    <button
                      key={address._id}
                      type="button"
                      onClick={() => handleSavedAddressSelect(address)}
                      disabled={manualLoading || locating}
                      className="rounded-2xl border border-white bg-white px-4 py-4 text-left shadow-sm transition hover:border-red-100 hover:shadow-md disabled:opacity-60"
                    >
                      <p className="text-sm font-bold text-gray-900">{address.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{address.subtitle}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!requireSelection && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionModal;
