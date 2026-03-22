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
  ShoppingBagIcon,
  MapPinIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const BRAND = '#E23744';
const BRAND_BG = '#FEF2F3';

/* ─────────────────────────
   SVG Icon helpers
───────────────────────── */
const LinkedInIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14C2.239 0 0 2.239 0 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

/* ─────────────────────────
   Row item component
───────────────────────── */
const MenuRow = ({ icon: Icon, label, sublabel, badge, onClick, to, danger }) => {
  const content = (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5 w-full transition-colors active:bg-gray-50"
      style={{ cursor: 'pointer' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: danger ? '#FFF0F0' : BRAND_BG }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: danger ? '#E23744' : BRAND }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14.5px] font-semibold leading-tight ${danger ? 'text-red-500' : 'text-gray-800'}`}>{label}</p>
        {sublabel && <p className="text-[12px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BRAND }}>
            {badge}
          </span>
        )}
        <ChevronRightIcon className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
};

/* ─────────────────────────
   Address type config
───────────────────────── */
const ADDRESS_TYPES = {
  home:  { label: 'Home',  color: '#E23744', bg: '#FEF2F3' },
  work:  { label: 'Work',  color: '#2563EB', bg: '#EFF6FF' },
  other: { label: 'Other', color: '#7C3AED', bg: '#F5F3FF' },
};

/* ─────────────────────────
   Main Component
───────────────────────── */
const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useSelector((s) => s.auth);

  /* ── Not logged in / loading guard ── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#E23744" strokeWidth="4" />
          <path className="opacity-75" fill="#E23744" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--bg-app)' }}>
        <div
          className="w-full max-w-sm bg-white rounded-3xl overflow-hidden text-center"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
        >
          {/* Header strip */}
          <div
            className="px-6 pt-10 pb-8"
            style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #3D1A1A 100%)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(226,55,68,0.25)' }}
            >
              <UserCircleIcon className="w-10 h-10 text-white" />
            </div>
            <p className="text-white text-[20px] font-black" style={{ letterSpacing: '-0.02em' }}>Your Profile</p>
            <p className="text-white/50 text-[13px] mt-1">Sign in to manage your account</p>
          </div>

          <div className="p-6 space-y-3">
            <Link
              to="/login"
              className="block w-full py-3.5 rounded-2xl text-[15px] font-bold text-white text-center"
              style={{ background: 'linear-gradient(135deg, #E23744, #C92535)', boxShadow: '0 4px 14px rgba(226,55,68,0.3)' }}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="block w-full py-3.5 rounded-2xl text-[15px] font-bold text-gray-700 text-center bg-gray-100"
            >
              Create Account
            </Link>
          </div>

          <div className="px-6 pb-6 space-y-2">
            {[
              { label: 'Help & Support', to: '/help' },
              { label: 'Partner with Us', to: '/partner' },
              { label: 'About FlashBites', to: '/about' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 text-[13px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {link.label}
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-300 mt-6">
          © {new Date().getFullYear()} FlashBites · All rights reserved
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [addressData, setAddressData] = useState({
    type: 'home', street: '', city: '', state: '', zipCode: '', landmark: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  useEffect(() => { fetchAddresses(); }, []);

  const fetchAddresses = async () => {
    try {
      const res = await getAddresses();
      setAddresses(res.data.addresses || []);
    } catch { /* silent */ }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await addAddress(addressData);
      toast.success('Address saved');
      setShowAddressForm(false);
      setAddressData({ type: 'home', street: '', city: '', state: '', zipCode: '', landmark: '' });
      fetchAddresses();
    } catch { toast.error('Failed to save address'); }
  };

  const handlePincodeChange = async (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressData(prev => ({ ...prev, zipCode: value }));

    if (value.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await response.json();
        
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const postOffice = data[0].PostOffice[0];
          setAddressData(prev => ({
            ...prev,
            city: postOffice.District,
            state: postOffice.State
          }));
          toast.success("City and State auto-detected");
        } else {
          toast.error("Invalid PIN code entered");
        }
      } catch (error) {
        console.error("Failed to fetch pincode details", error);
      }
    }
  };

  const handleDeleteAddress = async (id) => {
    const result = await Swal.fire({
      title: 'Remove this address?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E23744',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, remove it',
      borderRadius: '1rem',
    });
    if (!result.isConfirmed) return;
    
    try {
      await deleteAddress(id);
      toast.success('Address removed');
      fetchAddresses();
    } catch { toast.error('Could not remove address'); }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('You\'ve been signed out');
    navigate('/');
  };

  const avatarLetter = user?.name?.[0]?.toUpperCase() || 'U';

  /* ─── Role-based links ─── */
  const roleLinks = [
    ...(user?.role === 'admin'
      ? [{ icon: ShieldCheckIcon, label: 'Admin Dashboard', to: '/admin' }] : []),
    ...(user?.role === 'restaurant_owner'
      ? [{ icon: ShieldCheckIcon, label: 'Restaurant Dashboard', to: '/dashboard' }] : []),
    ...(user?.role === 'delivery_partner'
      ? [{ icon: ShieldCheckIcon, label: 'Delivery Dashboard', to: '/delivery-dashboard' }] : []),
  ];

  const menuSections = [
    {
      title: 'Orders & Payments',
      rows: [
        { icon: ShoppingBagIcon, label: 'My Orders', sublabel: 'Track your food orders', to: '/orders' },
        { icon: TagIcon, label: 'Coupons & Offers', badge: 'NEW', to: '/promos' },
        { icon: MapPinIcon, label: 'Saved Addresses', sublabel: `${addresses.length} saved`, onClick: () => setActiveTab('addresses') },
      ],
    },
    {
      title: 'Support',
      rows: [
        { icon: QuestionMarkCircleIcon, label: 'Help Center', sublabel: 'FAQs & live support', to: '/help' },
        { icon: UserGroupIcon, label: 'Partner with Us', to: '/partner' },
        { icon: InformationCircleIcon, label: 'About FlashBites', to: '/about' },
        ...roleLinks,
      ],
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>

      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1C1C1C 0%, #2D1515 60%, #3D1A1A 100%)',
          paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
          paddingBottom: '56px',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: BRAND, transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: BRAND, transform: 'translate(-30%, 30%)' }}
        />

        <div className="relative px-5 max-w-md sm:max-w-lg mx-auto">
          {/* Avatar + name */}
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div
              className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white text-[28px] font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${BRAND} 0%, #C92535 100%)`,
                boxShadow: '0 8px 24px rgba(226,55,68,0.45)',
              }}
            >
              {avatarLetter}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <h1
                className="text-white text-[22px] font-bold leading-tight truncate"
                style={{ letterSpacing: '-0.02em' }}
              >
                {user?.name || 'User'}
              </h1>
              <p className="text-white/50 text-[13px] mt-0.5 truncate">{user?.email}</p>
              {user?.phone && (
                <p className="text-white/40 text-[12px] mt-0.5">{user.phone}</p>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => { setActiveTab('profile'); setIsEditing(true); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-colors mb-1"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}
            >
              <PencilIcon className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab pills (overlapping hero) ── */}
      <div className="sticky top-0 z-30 px-5 max-w-md sm:max-w-lg mx-auto -mt-[20px]">
        <div
          className="flex rounded-2xl overflow-hidden border"
          style={{
            background: 'white',
            borderColor: '#F0F2F5',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          }}
        >
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'addresses', label: 'Addresses' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 text-[14px] font-semibold transition-all"
              style={
                activeTab === tab.id
                  ? { color: BRAND, borderBottom: `2px solid ${BRAND}`, background: BRAND_BG }
                  : { color: '#9CA3AF', borderBottom: '2px solid transparent' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4 pb-28 max-w-md sm:max-w-lg mx-auto space-y-4">

        {/* ═══════╗
            PROFILE TAB
            ╚═══════ */}
        {activeTab === 'profile' && (
          <>
            {/* Edit form */}
            {isEditing ? (
              <div
                className="bg-white rounded-2xl overflow-hidden animate-slide-up"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                  <h2 className="text-[15px] font-bold text-gray-900">Edit Profile</h2>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleProfileUpdate} className="p-4 space-y-4">
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
                    { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type}
                        value={profileData[f.key] || ''}
                        placeholder={f.placeholder}
                        onChange={(e) => setProfileData({ ...profileData, [f.key]: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-field"
                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-gray-600 bg-gray-100 transition-colors hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex-1 py-3 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${BRAND}, #C92535)`, boxShadow: '0 4px 14px rgba(226,55,68,0.3)' }}
                    >
                      {savingProfile ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ── Read-only info card ── */
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Personal Info</p>
                </div>
                {[
                  { label: 'Name', value: user?.name || '—' },
                  { label: 'Email', value: user?.email || '—' },
                  { label: 'Phone', value: user?.phone || 'Not added' },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-3.5"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid #F5F5F5' : 'none' }}
                  >
                    <p className="text-[13px] text-gray-400 font-medium">{row.label}</p>
                    <p className="text-[14px] font-semibold text-gray-800 text-right max-w-[200px] truncate">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Menu sections ── */}
            {menuSections.map((section) => (
              <div key={section.title}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
                  {section.title}
                </p>
                <div
                  className="bg-white rounded-2xl overflow-hidden divide-y"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', divideColor: '#F5F5F5' }}
                >
                  {section.rows.map((row, i) => (
                    <MenuRow key={i} {...row} />
                  ))}
                </div>
              </div>
            ))}

            {/* ── Social links ── */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
                Follow Us
              </p>
              <div
                className="bg-white rounded-2xl p-4 flex items-center gap-3"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              >
                {[
                  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/flash-bites/', Icon: LinkedInIcon, color: '#0A66C2' },
                  { label: 'Instagram', href: 'https://www.instagram.com/flashbites.in/', Icon: InstagramIcon, color: '#E1306C' },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[13px] transition-colors hover:opacity-80"
                    style={{ background: '#F5F7FA', color: s.color }}
                  >
                    <s.Icon />
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            {/* ── Sign out ── */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14.5px] font-bold transition-colors"
              style={{ background: '#FFF0F0', color: BRAND }}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Sign Out
            </button>

            {user?.role === 'user' && (
              <Link
                to="/account-delete"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14.5px] font-bold transition-colors"
                style={{ background: '#FFE4E6', color: '#DC2626' }}
              >
                <TrashIcon className="w-5 h-5" />
                Account Deletion Request
              </Link>
            )}

            <p className="text-center text-[11px] text-gray-300 pb-2">
              © {new Date().getFullYear()} FlashBites · All rights reserved
            </p>
          </>
        )}

        {/* ═══════╗
            ADDRESSES TAB
            ╚═══════ */}
        {activeTab === 'addresses' && (
          <>
            {/* Add button */}
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-bold text-white transition-all"
              style={{
                background: showAddressForm
                  ? '#6B7280'
                  : `linear-gradient(135deg, ${BRAND}, #C92535)`,
                boxShadow: showAddressForm ? 'none' : '0 4px 14px rgba(226,55,68,0.3)',
              }}
            >
              {showAddressForm ? (
                <><XMarkIcon className="w-5 h-5" /> Cancel</>
              ) : (
                <><PlusIcon className="w-5 h-5" /> Add New Address</>
              )}
            </button>

            {/* Add form */}
            {showAddressForm && (
              <form
                onSubmit={handleAddAddress}
                className="bg-white rounded-2xl overflow-hidden animate-slide-up"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              >
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">New Address</p>
                </div>
                <div className="p-4 space-y-3">
                  {/* Type selector */}
                  <div className="flex gap-2">
                    {['home', 'work', 'other'].map((t) => {
                      const cfg = ADDRESS_TYPES[t];
                      const active = addressData.type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAddressData({ ...addressData, type: t })}
                          className="flex-1 py-2 rounded-xl text-[13px] font-semibold capitalize transition-all"
                          style={
                            active
                              ? { background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}` }
                              : { background: '#F5F7FA', color: '#9CA3AF', border: '1.5px solid transparent' }
                          }
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fields */}
                  {[
                    { placeholder: 'Street address *', key: 'street', required: true },
                    { placeholder: 'City *', key: 'city', required: true },
                    { placeholder: 'State *', key: 'state', required: true },
                    { placeholder: 'PIN Code *', key: 'zipCode', required: true, isPincode: true },
                    { placeholder: 'Landmark (optional)', key: 'landmark', required: false },
                  ].map((f) => (
                    <input
                      key={f.key}
                      type="text"
                      placeholder={f.placeholder}
                      required={f.required}
                      maxLength={f.isPincode ? 6 : undefined}
                      pattern={f.isPincode ? "[0-9]{6}" : undefined}
                      value={addressData[f.key]}
                      onChange={(e) => f.isPincode ? handlePincodeChange(e) : setAddressData({ ...addressData, [f.key]: e.target.value })}
                      className="input-field"
                    />
                  ))}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl text-[14px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${BRAND}, #C92535)`, boxShadow: '0 4px 14px rgba(226,55,68,0.3)' }}
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            {/* Address list */}
            {addresses.length === 0 ? (
              <div
                className="bg-white rounded-2xl p-10 text-center"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: BRAND_BG }}
                >
                  <MapPinIcon className="w-8 h-8" style={{ color: BRAND }} />
                </div>
                <p className="font-bold text-gray-800 text-[16px]">No saved addresses</p>
                <p className="text-[13px] text-gray-400 mt-1">Add your home or work address for faster checkout</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => {
                  const cfg = ADDRESS_TYPES[a.type] || ADDRESS_TYPES.other;
                  return (
                    <div
                      key={a._id}
                      className="bg-white rounded-2xl overflow-hidden"
                      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                    >
                      <div className="flex items-start gap-3 p-4">
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: cfg.bg }}
                        >
                          <MapPinIcon className="w-5 h-5" style={{ color: cfg.color }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-[14px] font-semibold text-gray-900 leading-snug">{a.street}</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {a.city}, {a.state} – {a.zipCode}
                          </p>
                          {a.landmark && (
                            <p className="text-[12px] text-gray-400">Near: {a.landmark}</p>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteAddress(a._id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;