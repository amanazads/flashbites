import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiHome,
  FiBriefcase,
  FiMapPin,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { addAddress, deleteAddress, getAddresses, updateAddress } from '../api/userApi';

const EMPTY_FORM = {
  type: 'home',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  landmark: '',
};

const Addresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchAddresses = async () => {
    try {
      const response = await getAddresses();
      setAddresses(response?.data?.addresses || []);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (address) => {
    setEditingId(address._id);
    setFormData({
      type: address.type || 'home',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      landmark: address.landmark || '',
    });
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingId) {
        await updateAddress(editingId, formData);
        toast.success('Address updated');
      } else {
        await addAddress(formData);
        toast.success('Address added');
      }
      setShowForm(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      fetchAddresses();
    } catch {
      toast.error(editingId ? 'Failed to update address' : 'Failed to add address');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await deleteAddress(id);
      toast.success('Address deleted');
      fetchAddresses();
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const formatTitle = (addr) => {
    if (addr.type === 'home') return 'Home';
    if (addr.type === 'work') return 'Work';
    if (addr.type === 'other') return addr.landmark ? `Other: ${addr.landmark}` : 'Other';
    return 'Address';
  };

  const formatAddressLine = (addr) => {
    return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ');
  };

  const typeIcon = (type) => {
    if (type === 'home') return <FiHome className="w-5 h-5" />;
    if (type === 'work') return <FiBriefcase className="w-5 h-5" />;
    return <FiMapPin className="w-5 h-5" />;
  };

  return (
    <div className="bg-[#f3f4f6] min-h-screen">
      <div className="max-w-md mx-auto px-5 pt-5 pb-36">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Delivery Addresses</h1>
          <div className="w-9 h-9" />
        </div>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="text-center text-slate-500 text-sm py-8">Loading addresses...</div>
          )}

          {!loading && addresses.length === 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 px-5 py-8 text-center text-slate-500">
              No saved addresses yet
            </div>
          )}

          {!loading && addresses.map((addr) => (
            <div key={addr._id} className="rounded-3xl bg-white border border-slate-200 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f3ece8] text-orange-500 flex items-center justify-center shrink-0">
                  {typeIcon(addr.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[18px] font-semibold text-slate-900 truncate">{formatTitle(addr)}</h3>
                    {addr.isDefault && (
                      <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-semibold leading-none">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[15px] text-slate-500">{formatAddressLine(addr)}</p>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-2 flex items-center gap-4">
                <button
                  onClick={() => openEditForm(addr)}
                  className="flex items-center gap-1 text-orange-500 text-[14px] font-medium"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(addr._id)}
                  className="flex items-center gap-1 text-slate-400 text-[14px] font-medium"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">
            Nearby Service Areas
          </h3>
          <div className="h-44 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#e5e7eb,#d9dce2)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_30%_40%,white_0,transparent_45%),radial-gradient(circle_at_70%_60%,white_0,transparent_45%)]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-orange-500" />
            </div>
          </div>
        </section>
      </div>

      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-[#f3f4f6] border-t border-slate-200 px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={openAddForm}
          className="w-full h-12 rounded-full bg-orange-500 text-white text-[20px] font-semibold flex items-center justify-center gap-2 shadow-sm"
        >
          <FiMapPin className="w-5 h-5" />
          Add New Address
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-3xl p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            <form onSubmit={submitForm} className="space-y-3">
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-slate-700"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
              <input
                placeholder="Street"
                value={formData.street}
                onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200"
                />
                <input
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200"
                />
              </div>
              <input
                placeholder="Zip Code"
                value={formData.zipCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, zipCode: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200"
              />
              <input
                placeholder="Landmark (optional)"
                value={formData.landmark}
                onChange={(e) => setFormData((prev) => ({ ...prev, landmark: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-orange-500 text-white font-semibold"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Addresses;
