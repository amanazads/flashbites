import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { addAddress } from '../../api/userApi';
import toast from 'react-hot-toast';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

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
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const getQueryText = () => {
    const query = [formData.street, formData.landmark, formData.city, formData.state, formData.zipCode, 'India']
      .filter(Boolean)
      .join(', ');
    return query;
  };

  useEffect(() => {
    let cancelled = false;
    const query = getQueryText();

    const fetchSuggestions = async () => {
      if (query.length < 8 || formData.street.trim().length < 3) {
        setAddressSuggestions([]);
        return;
      }

      setSearchingAddress(true);
      try {
        let data = [];

        if (MAPBOX_TOKEN) {
          const mapboxResponse = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&country=in&limit=5&language=en&access_token=${MAPBOX_TOKEN}`
          );
          const mapboxData = await mapboxResponse.json();
          data = (mapboxData?.features || []).map((feature) => {
            const contexts = feature?.context || [];
            return {
              place_id: feature.id,
              label: feature.place_name,
              city: feature?.text || contexts.find((c) => c.id?.startsWith('place'))?.text || '',
              state: contexts.find((c) => c.id?.startsWith('region'))?.text || '',
              zipCode: contexts.find((c) => c.id?.startsWith('postcode'))?.text || '',
              lng: feature.center?.[0],
              lat: feature.center?.[1]
            };
          });
        } else {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
            {
              headers: {
                Accept: 'application/json'
              }
            }
          );
          const osmData = await response.json();
          data = (Array.isArray(osmData) ? osmData : []).map((item) => ({
            place_id: item.place_id,
            label: item.display_name,
            city: item?.address?.city || item?.address?.town || item?.address?.village || item?.address?.county || '',
            state: item?.address?.state || '',
            zipCode: item?.address?.postcode || '',
            lng: item.lon,
            lat: item.lat
          }));
        }

        if (!cancelled) {
          setAddressSuggestions(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingAddress(false);
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.street, formData.landmark, formData.city, formData.state, formData.zipCode]);

  const applySuggestion = (suggestion) => {
    const resolvedCity = suggestion?.city || formData.city;
    const resolvedState = suggestion?.state || formData.state;
    const resolvedZip = suggestion?.zipCode || formData.zipCode;
    const lat = Number(suggestion?.lat);
    const lng = Number(suggestion?.lng);

    setFormData((prev) => ({
      ...prev,
      street: suggestion?.label || prev.street,
      city: resolvedCity,
      state: resolvedState,
      zipCode: resolvedZip,
      fullAddress: suggestion?.label || prev.fullAddress,
      coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : prev.coordinates
    }));
    setAddressSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }

    setUsingCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        try {
          let reverseLabel = '';
          let reverseCity = '';
          let reverseState = '';
          let reverseZip = '';

          if (MAPBOX_TOKEN) {
            const mapboxResponse = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&language=en&access_token=${MAPBOX_TOKEN}`
            );
            const mapboxData = await mapboxResponse.json();
            const feature = mapboxData?.features?.[0];
            const contexts = feature?.context || [];
            reverseLabel = feature?.place_name || '';
            reverseCity = feature?.text || contexts.find((c) => c.id?.startsWith('place'))?.text || '';
            reverseState = contexts.find((c) => c.id?.startsWith('region'))?.text || '';
            reverseZip = contexts.find((c) => c.id?.startsWith('postcode'))?.text || '';
          } else {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
              { headers: { Accept: 'application/json' } }
            );
            const data = await response.json();
            const address = data?.address || {};
            reverseLabel = data?.display_name || '';
            reverseCity = address.city || address.town || address.village || address.county || '';
            reverseState = address.state || '';
            reverseZip = address.postcode || '';
          }

          setFormData((prev) => ({
            ...prev,
            street: reverseLabel || prev.street,
            city: reverseCity || prev.city,
            state: reverseState || prev.state,
            zipCode: reverseZip || prev.zipCode,
            fullAddress: reverseLabel || prev.fullAddress,
            coordinates: [lng, lat]
          }));
          toast.success('Location captured successfully');
        } catch {
          setFormData((prev) => ({ ...prev, coordinates: [lng, lat] }));
          toast.success('Location coordinates captured');
        } finally {
          setUsingCurrentLocation(false);
        }
      },
      () => {
        setUsingCurrentLocation(false);
        toast.error('Unable to fetch current location. Please allow location permission.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.zipCode.length !== 6) {
      toast.error('Please enter a valid 6-digit PIN code');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        fullAddress: formData.fullAddress || getQueryText(),
        coordinates: formData.coordinates || undefined,
        lat: formData.coordinates?.[1],
        lng: formData.coordinates?.[0]
      };

      const response = await addAddress(payload);
      toast.success('Address added successfully');
      onAddressAdded(response.data.address);
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
      setAddressSuggestions([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
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

          {/* Street */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value, fullAddress: '' })}
              placeholder="House/Flat No., Street name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            {searchingAddress && (
              <p className="mt-1 text-xs text-gray-500">Searching address suggestions...</p>
            )}
            {addressSuggestions.length > 0 && (
              <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="mt-2 text-xs font-semibold text-primary-600"
              disabled={usingCurrentLocation}
            >
              {usingCurrentLocation ? 'Detecting current location...' : 'Use Current Location'}
            </button>
          </div>

          {/* Landmark */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value, fullAddress: '', coordinates: null })}
              placeholder="Nearby landmark"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value, fullAddress: '', coordinates: null })}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value, fullAddress: '', coordinates: null })}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Zip Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN Code *
            </label>
            <input
              type="text"
              value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 6), fullAddress: '', coordinates: null })}
              placeholder="6-digit PIN code"
              maxLength={6}
              pattern="[0-9]{6}"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
              <p className="mt-1 text-xs text-gray-500">
                Tip: pick a suggestion or use current location for best delivery accuracy.
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
