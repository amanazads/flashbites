import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { addAddress } from '../../api/userApi';
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

    // Keep selected coordinates from map click. User can refine text fields manually.
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.street || !formData.city || !formData.state) {
      if (!formData.fullAddress?.trim()) {
        toast.error('Please fill address details and select from suggestions');
        return;
      }
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
            <AddressInput
              value={formData.fullAddress || formData.street}
              onChange={(value) => setFormData({ ...formData, street: value, fullAddress: value, coordinates: null })}
              onSelect={handleGoogleAddressSelect}
              placeholder="Search delivery address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value, fullAddress: e.target.value, coordinates: null })}
              placeholder="House/Flat No., Street name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Select an address from suggestions to lock accurate coordinates.</p>
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
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
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
