import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { addAddress } from '../../api/userApi';
import { reverseGeocodeCoordinates } from '../../api/locationApi';
import toast from 'react-hot-toast';
import AddressInput from '../location/AddressInput';
import MapPicker from '../location/MapPicker';

const AddAddressModal = ({ isOpen, onClose, onAddressAdded }) => {
  const [formData, setFormData] = useState({
    type: 'home',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    landmark: '',
    fullAddress: '',
    coordinates: null
  });
  const [loading, setLoading] = useState(false);
  const [reverseLookupLoading, setReverseLookupLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const getQueryText = () => {
    const query = [formData.street, formData.landmark, formData.city, formData.state, formData.zipCode, 'India']
      .filter(Boolean)
      .join(', ');
    return query;
  };

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      type: 'home',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      landmark: '',
      fullAddress: '',
      coordinates: null
    });
  }, [isOpen]);

  const handleGoogleAddressSelect = (selection) => {
    const lat = Number(selection?.lat);
    const lng = Number(selection?.lng);

    setFormData((prev) => ({
      ...prev,
      street: selection?.street || selection?.address || prev.street,
      city: selection?.city || prev.city,
      state: selection?.state || prev.state,
      zipCode: selection?.zipCode || prev.zipCode,
      fullAddress: selection?.fullAddress || selection?.address || prev.fullAddress,
      coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : prev.coordinates
    }));
  };

  const handleMapSelect = async ({ lat, lng }) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;

    setFormData((prev) => ({ ...prev, coordinates: [lngNum, latNum] }));

    // Auto-fill address fields from the map pin for better coordinate/address consistency.
    try {
      setReverseLookupLoading(true);
      const response = await reverseGeocodeCoordinates(latNum, lngNum);
      const location = response?.data?.location || response?.location || null;
      if (!location) return;

      setFormData((prev) => ({
        ...prev,
        fullAddress: location.fullAddress || prev.fullAddress,
        street: location.street || prev.street,
        city: location.city || prev.city,
        state: location.state || prev.state,
        zipCode: location.zipCode || prev.zipCode,
        coordinates: [lngNum, latNum]
      }));
    } catch {
      // Keep coordinates even if reverse lookup fails.
    } finally {
      setReverseLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullAddress?.trim()) {
      toast.error('Please search and select a delivery address');
      return;
    }

    const coordinates = formData.coordinates;
    if (!coordinates || coordinates.length < 2) {
      toast.error('Please select a valid address from suggestions');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        street: formData.street || formData.fullAddress,
        fullAddress: formData.fullAddress || getQueryText(),
        coordinates,
        lat: coordinates?.[1],
        lng: coordinates?.[0]
      };

      const response = await addAddress(payload);
      const createdAddress = response?.data?.address || response?.address || null;
      if (!createdAddress?._id) {
        throw new Error('Address saved but response payload was invalid');
      }

      toast.success('Address added successfully');
      onAddressAdded(createdAddress);
      onClose();
      // Reset form
      setFormData({
        type: 'home',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        landmark: '',
        fullAddress: '',
        coordinates: null
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setLocating(true);

    const browserFallback = () => {
      if (!navigator.geolocation) {
        setLocating(false);
        toast.error('Geolocation is not supported on this device/browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position?.coords?.latitude);
          const lng = Number(position?.coords?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            setLocating(false);
            toast.error('Unable to read your current location');
            return;
          }

          await handleMapSelect({ lat, lng });
          setLocating(false);
          toast.success('Current location selected');
        },
        () => {
          setLocating(false);
          toast.error('Unable to fetch current location. Please allow location permission.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    // Use native permission flow in Capacitor apps.
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
      import('@capacitor/geolocation')
        .then(async ({ Geolocation }) => {
          await Geolocation.requestPermissions();
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });

          const lat = Number(position?.coords?.latitude);
          const lng = Number(position?.coords?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error('Invalid location coordinates');
          }

          await handleMapSelect({ lat, lng });
          setLocating(false);
          toast.success('Current location selected');
        })
        .catch(() => {
          // Fallback to browser geolocation in case plugin is unavailable.
          browserFallback();
        });
      return;
    }

    browserFallback();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add New Address</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Address Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Type *
            </label>
            <div className="flex gap-3">
              {['home', 'work', 'other'].map((type) => (
                <label
                  key={type}
                  className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition ${
                    formData.type === type
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-primary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="sr-only"
                  />
                  <span className="capitalize font-medium">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Search address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Delivery Address *
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-60"
            >
              {locating ? 'Locating...' : 'Use Current Location'}
            </button>
            <AddressInput
              value={formData.fullAddress}
              onChange={(value) => setFormData({ ...formData, fullAddress: value, coordinates: null })}
              onSelect={handleGoogleAddressSelect}
              placeholder="Search delivery address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Select from suggestions, then optionally fine-tune the pin on map.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pinpoint On Map
            </label>
            <MapPicker
              initialPosition={{
                lat: Number(formData.coordinates?.[1]) || 31.53,
                lng: Number(formData.coordinates?.[0]) || 75.91
              }}
              onSelect={handleMapSelect}
              mapHeight={220}
            />
            {Array.isArray(formData.coordinates) && formData.coordinates.length >= 2 && (
              <p className="mt-2 text-xs text-green-700">
                Coordinates: {Number(formData.coordinates[1]).toFixed(6)}, {Number(formData.coordinates[0]).toFixed(6)}
              </p>
            )}
            {reverseLookupLoading && (
              <p className="mt-1 text-xs text-gray-500">Resolving map pin address...</p>
            )}
          </div>

          {/* Flat / house details */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Flat / House / Area Details
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="Flat no, floor, nearby spot"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Landmark */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              placeholder="Nearby landmark"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Auto-filled city"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Auto-filled state"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Zip Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN Code (Optional)
            </label>
            <input
              type="text"
              value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="PIN code (optional)"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
              <p className="mt-1 text-xs text-gray-500">
                Tip: always pick an address suggestion or map point so delivery uses exact coordinates.
              </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAddressModal;
