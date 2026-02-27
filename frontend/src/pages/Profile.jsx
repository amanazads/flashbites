import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, getAddresses, addAddress, deleteAddress } from '../api/userApi';
import { logout } from '../redux/slices/authSlice';
import {
  FiArrowLeft,
  FiBell,
  FiHome,
  FiSearch,
  FiShoppingBag,
  FiCreditCard,
  FiMapPin,
  FiTag,
  FiSettings,
  FiHelpCircle,
  FiUsers,
  FiInfo,
  FiEdit2,
  FiLogOut,
  FiChevronRight,
  FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [avatarLetter, setAvatarLetter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === undefined) return; // Wait for Redux to resolve

    const hasToken = !!(localStorage.getItem('accessToken') || localStorage.getItem('token'));
    if (!user && !hasToken) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user && hasToken) {
      // Keep loading while auth state rehydrates after refresh
      setLoading(true);
      return;
    }

    setAvatarLetter(user.name ? user.name[0] : '');
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    if (!loading && user) {
      fetchAddresses();
    }
    // eslint-disable-next-line
  }, [loading, user]);

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

  const menuItems = {
    activity: [
      {
        icon: <FiShoppingBag className="w-5 h-5" />,
        label: 'My Orders',
        path: '/orders',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      },
      {
        icon: <FiCreditCard className="w-5 h-5" />,
        label: 'Payment Methods',
        path: '/payment-methods',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      },
      {
        icon: <FiMapPin className="w-5 h-5" />,
        label: 'Delivery Addresses',
        path: '/addresses',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      }
    ],
    preferences: [
      {
        icon: <FiTag className="w-5 h-5" />,
        label: 'Promos & Coupons',
        path: '/promos',
        badge: '2 NEW',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      },
      {
        icon: <FiSettings className="w-5 h-5" />,
        label: 'Settings',
        path: '/settings',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      }
    ],
    support: [
      {
        icon: <FiHelpCircle className="w-5 h-5" />,
        label: 'Help Center',
        path: '/help',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      }
    ],
    quickLinks: [
      {
        icon: <FiUsers className="w-5 h-5" />,
        label: 'Partner With Us',
        path: '/partner',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      },
      {
        icon: <FiInfo className="w-5 h-5" />,
        label: 'About FlashBites',
        path: '/about',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500'
      }
    ]
  };

  const MenuItem = ({ item }) => (
    <button
      onClick={() => navigate(item.path)}
      className="w-full flex items-center justify-between py-3.5 transition-colors active:opacity-80"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`${item.iconBg} ${item.iconColor} w-11 h-11 rounded-2xl flex items-center justify-center shrink-0`}>
          {item.icon}
        </div>
        <span className="text-slate-900 font-medium text-[16px] leading-6 truncate">{item.label}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {item.badge && (
          <span className="bg-orange-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full leading-none">
            {item.badge}
          </span>
        )}
        <FiChevronRight className="w-5 h-5 text-slate-400" />
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="mt-4 text-orange-500 font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f3f4f6]">
      {/* Header */}
      <div className="bg-[#f3f4f6]">
        <div className="max-w-md mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center transition-colors active:bg-slate-200"
          >
            <FiArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Profile</h1>
          <button
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center transition-colors active:bg-slate-200"
          >
            <FiBell className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-md mx-auto px-5 pt-6 pb-32">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#f6d9cf] flex items-center justify-center">
              <div className="w-[88px] h-[88px] rounded-full border-[3px] border-white bg-[#e7d1ae] flex items-center justify-center">
                <span className="text-3xl font-semibold text-slate-700">
                  {avatarLetter || 'U'}
                </span>
              </div>
            </div>
            <button className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-2 rounded-full shadow-md active:bg-orange-600 transition-colors">
              <FiEdit2 className="w-4 h-4" />
            </button>
          </div>

          {/* User Info */}
          <h2 className="mt-4 text-[30px] leading-tight font-semibold text-slate-900 text-center">
            {user?.name}
          </h2>
          <p className="mt-1 text-slate-500 text-[15px] text-center break-all">
            {user?.email}
          </p>
        </div>

        {/* Activity Section */}
        <div className="mt-7">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">
            Activity
          </h3>
          <div className="space-y-1">
            {menuItems.activity.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Offers & Preferences Section */}
        <div className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">
            Offers & Preferences
          </h3>
          <div className="space-y-1">
            {menuItems.preferences.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">
            Support
          </h3>
          <div className="space-y-1">
            {menuItems.support.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">
            Quick Links
          </h3>
          <div className="space-y-1">
            {menuItems.quickLinks.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <button
            onClick={handleLogout}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-[18px] bg-slate-200/80 active:bg-slate-300 transition-colors"
          >
            <FiLogOut className="w-5 h-5 text-slate-700" />
            <span className="text-slate-700 font-semibold text-[17px] leading-none">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation (design match) */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white border-t border-gray-200"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-4 px-2 py-2">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center justify-center gap-1 py-1"
          >
            <FiHome className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] leading-none font-medium text-slate-400">Home</span>
          </button>
          <button
            onClick={() => navigate('/restaurants')}
            className="flex flex-col items-center justify-center gap-1 py-1"
          >
            <FiSearch className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] leading-none font-medium text-slate-400">Search</span>
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="flex flex-col items-center justify-center gap-1 py-1"
          >
            <FiShoppingBag className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] leading-none font-medium text-slate-400">Orders</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center justify-center gap-1 py-1"
          >
            <FiUser className="w-5 h-5 text-orange-500" />
            <span className="text-[10px] leading-none font-medium text-orange-500">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
