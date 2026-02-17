import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { updateProfile, getAddresses, addAddress, deleteAddress } from '../api/userApi';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [addressData, setAddressData] = useState({
    type: 'home',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    landmark: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await getAddresses();
      setAddresses(response.data.addresses);
    } catch (error) {
      toast.error('Failed to load addresses');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await addAddress(addressData);
      toast.success('Address added successfully');
      setShowAddressForm(false);
      setAddressData({ type: 'home', street: '', city: '', state: '', zipCode: '', landmark: '' });
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddress(id);
        toast.success('Address deleted');
        fetchAddresses();
      } catch (error) {
        toast.error('Failed to delete address');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">My Profile</h1>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b overflow-x-auto">
            <div className="flex min-w-max">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Profile Details
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium whitespace-nowrap ${
                  activeTab === 'addresses'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Addresses
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex justify-between items-center gap-3 mb-6">
                  <h2 className="text-lg sm:text-xl font-bold">Personal Information</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn-outline flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={!isEditing}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email}
                      disabled
                      className="input-field bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="input-field"
                    />
                  </div>

                  {isEditing && (
                    <button type="submit" className="btn-primary">
                      Save Changes
                    </button>
                  )}
                </form>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div>
                <div className="flex justify-between items-center gap-3 mb-6">
                  <h2 className="text-lg sm:text-xl font-bold">Saved Addresses</h2>
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Address</span>
                  </button>
                </div>

                {/* Add Address Form */}
                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                          value={addressData.type}
                          onChange={(e) => setAddressData({ ...addressData, type: e.target.value })}
                          className="input-field"
                        >
                          <option value="home">Home</option>
                          <option value="work">Work</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Street Address</label>
                      <input
                        type="text"
                        value={addressData.street}
                        onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City</label>
                        <input
                          type="text"
                          value={addressData.city}
                          onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State</label>
                        <input
                          type="text"
                          value={addressData.state}
                          onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">ZIP Code</label>
                        <input
                          type="text"
                          value={addressData.zipCode}
                          onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button type="submit" className="btn-primary">
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Address List */}
                <div className="space-y-3">
                  {addresses.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No saved addresses</p>
                  ) : (
                    addresses.map((address) => (
                      <div key={address._id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                        <div>
                          <span className="badge badge-info mb-2 capitalize">{address.type}</span>
                          <p className="font-medium">{address.street}</p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} - {address.zipCode}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAddress(address._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;