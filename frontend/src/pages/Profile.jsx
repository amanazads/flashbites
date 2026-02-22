import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, getAddresses, addAddress, deleteAddress } from '../api/userApi';
import { logout } from '../redux/slices/authSlice';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BRAND = '#96092B';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [addressData, setAddressData] = useState({
    type: 'home', street: '', city: '', state: '', zipCode: '', landmark: '',
  });

  useEffect(() => { fetchAddresses(); }, []);

  const fetchAddresses = async () => {
    try {
      const res = await getAddresses();
      setAddresses(res.data.addresses);
    } catch { toast.error('Failed to load addresses'); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      toast.success('Profile updated!');
      setIsEditing(false);
    } catch { toast.error('Failed to update profile'); }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await addAddress(addressData);
      toast.success('Address added!');
      setShowAddressForm(false);
      setAddressData({ type: 'home', street: '', city: '', state: '', zipCode: '', landmark: '' });
      fetchAddresses();
    } catch { toast.error('Failed to add address'); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await deleteAddress(id);
      toast.success('Address deleted');
      fetchAddresses();
    } catch { toast.error('Failed to delete'); }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out');
    navigate('/');
  };

  /* ─── Quick links for mobile (footer content) ─── */
  const quickLinks = [
    ...(user?.role === 'admin' ? [{ label: 'Admin Dashboard', to: '/admin', icon: '🛡️' }] : []),
    ...(user?.role === 'restaurant_owner' ? [{ label: 'Restaurant Dashboard', to: '/dashboard', icon: '🏪' }] : []),
    ...(user?.role === 'delivery_partner' ? [{ label: 'Delivery Dashboard', to: '/delivery-dashboard', icon: '🛵' }] : []),
    { label: 'Restaurants', to: '/restaurants', icon: '🍽️' },
    { label: 'My Orders', to: '/orders', icon: '📦' },
    { label: 'About FlashBites', to: '/about', icon: 'ℹ️' },
    { label: 'Partner with us', to: '/partner', icon: '🤝' },
    { label: 'Terms & Conditions', to: '/terms', icon: '📄' },
    { label: 'Privacy Policy', to: '/privacy', icon: '🔒' },
  ];

  /* ─── Support & Help links ─── */
  const supportLinks = [
    { label: 'Help Center & FAQs', to: '/help', icon: '❓', external: false },
    { label: 'Contact Support', to: 'mailto:support@flashbites.com', icon: '💬', external: true },
  ];

  const socialLinks = [
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/flash-bites/',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      ),
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/flashbites.shop/',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
    },
  ];

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'addresses', label: 'Addresses' },
  ];

  return (
    <div className="page-wrapper">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">

        {/* Avatar header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #333333)` }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user?.name || 'User'}</h1>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all"
              style={activeTab === t.id
                ? { background: BRAND, color: 'white' }
                : { background: 'white', color: '#6B7280', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Profile tab ─── */}
        {activeTab === 'profile' && (
          <div className="card p-5 sm:p-6 mb-4">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-gray-900">Personal Info</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: BRAND }}
              >
                <PencilIcon className="h-4 w-4" />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {[
                { label: 'Name', key: 'name', type: 'text', value: profileData.name || '', disabled: !isEditing },
                { label: 'Email', key: 'email', type: 'email', value: user?.email || '', disabled: true },
                { label: 'Phone', key: 'phone', type: 'tel', value: profileData.phone || '', disabled: !isEditing },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={f.value}
                    disabled={f.disabled}
                    onChange={f.disabled ? undefined : (e) => setProfileData({ ...profileData, [f.key]: e.target.value })}
                    className="input-field"
                    style={f.disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  />
                </div>
              ))}
              {isEditing && (
                <button type="submit" className="btn-primary w-full">Save changes</button>
              )}
            </form>
          </div>
        )}

        {/* ─── Addresses tab ─── */}
        {activeTab === 'addresses' && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">Saved Addresses</h2>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="flex items-center gap-1 text-sm font-semibold"
                style={{ color: BRAND }}
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="card p-5 mb-4 space-y-3">
                <select
                  value={addressData.type}
                  onChange={(e) => setAddressData({ ...addressData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="home">🏠 Home</option>
                  <option value="work">💼 Work</option>
                  <option value="other">📌 Other</option>
                </select>
                <input type="text" placeholder="Street address" className="input-field" required
                  value={addressData.street} onChange={(e) => setAddressData({ ...addressData, street: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="City" className="input-field" required
                    value={addressData.city} onChange={(e) => setAddressData({ ...addressData, city: e.target.value })} />
                  <input type="text" placeholder="State" className="input-field" required
                    value={addressData.state} onChange={(e) => setAddressData({ ...addressData, state: e.target.value })} />
                </div>
                <input type="text" placeholder="ZIP Code" className="input-field" required
                  value={addressData.zipCode} onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })} />
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1 py-2.5 text-sm">Save</button>
                  <button type="button" onClick={() => setShowAddressForm(false)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                </div>
              </form>
            )}

            {addresses.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-4xl mb-3">📍</p>
                <p className="text-gray-400 text-sm">No saved addresses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <div key={a._id} className="card p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="badge badge-brand capitalize mb-1">{a.type}</span>
                      <p className="font-semibold text-sm text-gray-900 mt-1">{a.street}</p>
                      <p className="text-xs text-gray-400">{a.city}, {a.state} {a.zipCode}</p>
                    </div>
                    <button onClick={() => handleDeleteAddress(a._id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Quick Links (footer content on mobile) ─── */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Quick Links</h3>
          <div className="card overflow-hidden">
            {quickLinks.map((lnk, i) => (
              <Link
                key={lnk.to}
                to={lnk.to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-primary-50 transition-colors"
                style={{ borderBottom: i < quickLinks.length - 1 ? '1px solid #F3F4F6' : 'none' }}
              >
                <span className="text-base">{lnk.icon}</span>
                <span className="flex-1 text-sm font-medium text-gray-700">{lnk.label}</span>
                <ChevronRightIcon className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Social ─── */}
        <div className="mt-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Follow Us</h3>
          <div className="card p-4 flex items-center gap-4">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                {s.icon}
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* ─── Sign out ─── */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>

        {/* ─── Copyright ─── */}
        <p className="text-center text-xs text-gray-300 mt-6">
          © {new Date().getFullYear()} FlashBites. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Profile;