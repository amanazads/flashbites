import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, getAddresses, deleteAddress } from '../api/userApi';
import { getUserOrders } from '../api/orderApi';
import { logout } from '../redux/slices/authSlice';
import * as authApi from '../api/authApi';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NoSymbolIcon,
  PencilIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  TagIcon,
  TrashIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
  HomeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BRAND } from '../constants/theme';
import logo from '../assets/logo.png';
import AddAddressModal from '../components/common/AddAddressModal';
import { useLanguage } from '../contexts/LanguageContext';

const PAGE_BG = '#F5F1EF';
const CARD_BG = '#FFFFFF';

const ADDRESS_TYPES = {
  home: { label: 'Home', color: '#EA580C', bg: '#FFF7ED' },
  work: { label: 'Work', color: '#2563EB', bg: '#EFF6FF' },
  other: { label: 'Other', color: '#7C3AED', bg: '#F5F3FF' },
};

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <defs>
      <linearGradient id="igGrad" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FEDA75" />
        <stop offset="0.35" stopColor="#FA7E1E" />
        <stop offset="0.6" stopColor="#D62976" />
        <stop offset="0.8" stopColor="#962FBF" />
        <stop offset="1" stopColor="#4F5BD5" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGrad)" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
    <circle cx="17.1" cy="6.9" r="1.2" fill="#fff" />
  </svg>
);

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
    <circle cx="7.2" cy="8.1" r="1.45" fill="#fff" />
    <rect x="5.9" y="10" width="2.6" height="7.7" fill="#fff" />
    <path d="M10.4 10h2.5v1.05h.04c.35-.66 1.13-1.35 2.34-1.35 2.5 0 2.98 1.64 2.98 3.8v4.2h-2.62v-3.3c0-.8-.02-1.88-1.14-1.88-1.12 0-1.3.87-1.3 1.82v3.36H10.4V10Z" fill="#fff" />
  </svg>
);

const ProfileRow = ({ icon: Icon, label, badge, to, onClick }) => {
  const content = (
    <div className="flex items-center gap-3 px-0.5 py-4">
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#EEE3DF' }}>
        <Icon className="w-5 h-5" style={{ color: BRAND }} />
      </div>
      <p className="flex-1 min-w-0 text-[16px] max-[388px]:text-[15px] font-semibold text-[#1E1513] truncate">{label}</p>
      {badge ? (
        <span
          className="text-[10px] font-extrabold text-white px-2.5 py-1 rounded-full leading-none"
          style={{ background: 'linear-gradient(90deg, #EA580C 0%, #F97316 100%)' }}
        >
          {badge}
        </span>
      ) : null}
      <ChevronRightIcon className="w-4 h-4 text-[#CFB7AF]" />
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
};

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useSelector((s) => s.auth);
  const { t, openLanguageModal } = useLanguage();

  const [addresses, setAddresses] = useState([]);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);

  const [profileData, setProfileData] = useState({ name: user?.name || '', phone: user?.phone || '' });

  useEffect(() => {
    if (user) {
      setProfileData({ name: user?.name || '', phone: user?.phone || '' });
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
    fetchOrdersCount();
  }, []);

  const fetchOrdersCount = async () => {
    try {
      const res = await getUserOrders({ page: 1, limit: 1 });
      const count =
        Number(res?.pagination?.total) ||
        Number(res?.data?.pagination?.total) ||
        Number(res?.total) ||
        (Array.isArray(res?.orders) ? res.orders.length : 0);
      setOrdersCount(count);
    } catch {
      setOrdersCount(0);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await getAddresses();
      setAddresses(res?.data?.addresses || []);
    } catch {
      setAddresses([]);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileData);
      toast.success(t('profile.updated', 'Profile updated successfully'));
      setIsEditing(false);
    } catch {
      toast.error(t('profile.updateFailed', 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    const result = await Swal.fire({
      title: 'Remove this address?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EA580C',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, remove it',
      borderRadius: '1rem',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteAddress(id);
      toast.success(t('profile.addressRemoved', 'Address removed'));
      fetchAddresses();
    } catch {
      toast.error(t('profile.addressRemoveFailed', 'Could not remove address'));
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue local logout even if server logout fails.
    }
    dispatch(logout());
    toast.success(t('profile.signedOut', "You've been signed out"));
    navigate('/');
  };

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const roleRows = useMemo(
    () => [
      ...(user?.role === 'admin' ? [{ icon: ShieldCheckIcon, label: t('nav.admin', 'Admin') + ' ' + t('nav.dashboard', 'Dashboard'), to: '/admin' }] : []),
      ...(user?.role === 'restaurant_owner' ? [{ icon: ShieldCheckIcon, label: t('nav.restaurants', 'Restaurants') + ' ' + t('nav.dashboard', 'Dashboard'), to: '/dashboard' }] : []),
      ...(user?.role === 'delivery_partner' ? [{ icon: ShieldCheckIcon, label: t('help.deliveryPartnership', 'Delivery') + ' ' + t('nav.dashboard', 'Dashboard'), to: '/delivery-dashboard' }] : []),
    ],
    [user?.role, t]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#EA580C" strokeWidth="4" />
          <path className="opacity-75" fill="#EA580C" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: PAGE_BG }}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#FFF7ED' }}>
            <UserCircleIcon className="w-10 h-10" style={{ color: BRAND }} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">{t('profile.title', 'Your Profile')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('profile.signInManage', 'Sign in to manage your account')}</p>
          <div className="mt-6 space-y-3">
            <Link to="/login" className="block w-full py-3.5 rounded-2xl text-[15px] font-bold text-white" style={{ background: BRAND }}>
              {t('profile.signIn', 'Sign In')}
            </Link>
            <Link to="/register" className="block w-full py-3.5 rounded-2xl text-[15px] font-bold bg-gray-100 text-gray-700">
              {t('profile.createAccount', 'Create Account')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryRows = [
    { icon: ShoppingBagIcon, label: t('profile.orderHistory', 'Orders History'), to: '/orders' },
    { icon: MapPinIcon, label: t('profile.savedAddresses', 'Saved Addresses'), onClick: () => setShowAddressSheet(true) },
    { icon: TagIcon, label: t('profile.couponsOffers', 'Coupons & Offers'), to: '/promos' },
    { icon: QuestionMarkCircleIcon, label: t('profile.helpSupport', 'Help & Support'), to: '/help' },
    { icon: Cog6ToothIcon, label: t('profile.settings', 'Settings'), to: '/notifications' },
    { icon: UserGroupIcon, label: t('profile.partnerWithUs', 'Partner with Us'), to: '/partner' },
    { icon: InformationCircleIcon, label: t('profile.aboutFlashBites', 'About FlashBites'), to: '/about' },
    ...roleRows,
  ];

  const isActiveRoute = (key) => {
    if (key === 'home') return location.pathname === '/';
    if (key === 'search') return location.pathname === '/restaurants' || location.pathname.startsWith('/restaurant/');
    if (key === 'orders') return location.pathname.startsWith('/orders');
    if (key === 'profile') return location.pathname.startsWith('/profile');
    return false;
  };

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-md mx-auto px-6 max-[388px]:px-4 pt-0 pb-[calc(84px+env(safe-area-inset-bottom,0px))]">
        <div className="px-4 pt-[max(env(safe-area-inset-top),10px)] -mx-6 max-[388px]:-mx-4 mb-4" style={{ backgroundColor: 'rgb(245, 243, 241)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                aria-label="Go back"
                style={{ background: 'linear-gradient(rgb(255, 122, 69) 0%, rgb(234, 88, 12) 100%)' }}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <button type="button" onClick={() => setShowAddressSheet(true)} className="flex items-center gap-2 text-left">
                <MapPinIcon className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />
                <div>
                  <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
                  <p className="text-[12px] leading-none font-semibold text-gray-900">{t('common.currentArea', 'Current Area')}</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openLanguageModal}
                className="h-10 w-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700"
                aria-label="Change language"
                title="Change language"
              >
                <GlobeAltIcon className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => navigate('/restaurants')}>
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-700" />
              </button>
              <button type="button" onClick={() => setIsEditing(true)} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                <img src={logo} alt="Profile" className="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-[32px] px-5 py-5" style={{ background: CARD_BG, boxShadow: '0 6px 16px rgba(60,30,20,0.06)' }}>
          <div className="relative w-[124px] h-[124px] mx-auto">
            <div className="absolute inset-0 rounded-full border border-[#EAD7D0]" style={{ background: '#FFF6F2' }} />
            <div className="absolute inset-[6px] rounded-full overflow-hidden" style={{ background: '#FFF6F2' }}>
              <img src={logo} alt="Profile" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="absolute right-0 bottom-[6px] w-10 h-10 rounded-full border-2 border-white flex items-center justify-center"
              style={{ background: BRAND }}
              aria-label="Edit profile"
            >
              <PencilIcon className="w-4 h-4 text-white" />
            </button>
          </div>

          <h2 className="text-center mt-4 text-[29px] max-[388px]:text-[27px] leading-tight font-black text-[#1A100E]">{user?.name || 'User'}</h2>
          <p className="text-center mt-1 text-[#3D3532] text-[23px] max-[388px]:text-[15px] truncate">{user?.email}</p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[13px] max-[388px]:text-[11px] font-black tracking-wide" style={{ background: '#F4DDD3', color: '#EA580C' }}>
              {t('profile.goldMember', 'GOLD MEMBER')}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[13px] max-[388px]:text-[11px] font-black tracking-wide text-[#3A2722]" style={{ background: '#F4DDD3' }}>
              4.9 *
            </span>
          </div>
        </section>

        <section className="mt-9 flex justify-center">
          <div className="text-center">
            <p className="text-[42px] max-[388px]:text-[34px] leading-none font-black text-[#1A1514]">{ordersCount}</p>
            <p className="text-[12px] mt-2 uppercase tracking-[0.18em] text-[#2E2724]">{t('profile.totalOrders', 'Total Orders')}</p>
          </div>
        </section>

        <section className="mt-9">
          <p className="text-[18px] max-[388px]:text-[15px] font-black tracking-[0.2em] text-[#3A2A26] mb-3">{t('profile.accountSettings', 'ACCOUNT SETTINGS')}</p>

          <div className="divide-y divide-[#E5D7D0]">
            {primaryRows.map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className={row.label === 'Coupons & Offers' || row.label === 'Partner with Us' ? 'pt-2 mt-1 border-t border-[#E9DBD4]' : ''}
              >
                <ProfileRow {...row} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7 flex items-center justify-center gap-7 text-[#5D403A]">
          <button type="button" onClick={() => openExternal('https://www.instagram.com/flashbites.in/')} aria-label="Open Instagram">
            <InstagramIcon />
          </button>
          <button type="button" onClick={() => openExternal('https://www.linkedin.com/company/flash-bites/')} aria-label="Open LinkedIn">
            <LinkedInIcon />
          </button>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-7 w-full py-4 rounded-full text-[21px] max-[388px]:text-[17px] font-black"
          style={{ background: '#FAEFEC', color: '#CB1B1B' }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            {t('profile.logOut', 'Log Out')}
          </span>
        </button>

        {user?.role === 'user' ? (
          <Link to="/account-delete" className="mt-4 flex items-center justify-center gap-2 text-[14px] max-[388px]:text-[12px] text-gray-500 font-medium">
            <NoSymbolIcon className="w-4 h-4" />
            {t('profile.requestDelete', 'Request Account Deletion')}
          </Link>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#E6E2DE] bg-[#F5F3F1]" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto px-6 pt-2 flex items-center justify-between text-[#B0ACA8]">
          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/"
            style={isActiveRoute('home') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('common.home', 'Home')}</span>
          </Link>

          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/restaurants"
            style={isActiveRoute('search') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('common.search', 'Search')}</span>
          </Link>

          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/orders"
            style={isActiveRoute('orders') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <ShoppingBagIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('nav.orders', 'Orders')}</span>
          </Link>

          <Link
            className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
            to="/profile"
            style={isActiveRoute('profile') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}
          >
            <UserIcon className="h-5 w-5" />
            <span className="text-[8px]">{t('common.profile', 'Profile')}</span>
          </Link>
        </div>
      </div>

      {isEditing ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-gray-900">{t('profile.editProfile', 'Edit Profile')}</h2>
              <button type="button" onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-1.5">{t('register.fullName', 'Full Name')}</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder={t('register.fullNamePlaceholder', 'Your name')}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-1.5">{t('auth.login.phoneNumber', 'Phone')}</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="input-field"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-1.5">Email</label>
                <input type="email" disabled value={user?.email || ''} className="input-field" style={{ opacity: 0.6 }} />
              </div>

              <div className="pt-1 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
                >
                  {t('profile.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-3 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: BRAND }}
                >
                  {savingProfile ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  {savingProfile ? t('profile.saving', 'Saving...') : t('profile.save', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showAddressSheet ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[86vh] bg-white rounded-3xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-gray-900">{t('profile.savedAddresses', 'Saved Addresses')}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddressSheet(false);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddressSheet(false);
                  setShowAddAddressModal(true);
                }}
                className="w-full py-3 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2"
                style={{ background: BRAND }}
              >
                <PlusIcon className="w-5 h-5" />
                {t('profile.addNewAddress', 'Add New Address')}
              </button>

              {addresses.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 p-5 text-center">
                  <p className="font-semibold text-gray-800">{t('profile.noSavedAddress', 'No saved addresses yet')}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('profile.addHomeWork', 'Add your home or work address for faster checkout.')}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {addresses.map((address) => {
                    const cfg = ADDRESS_TYPES[address.type] || ADDRESS_TYPES.other;
                    return (
                      <div key={address._id} className="rounded-2xl border border-gray-100 p-3 flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                          <MapPinIcon className="w-5 h-5" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <p className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{address.street}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {address.city}, {address.state} - {address.zipCode}
                          </p>
                          {address.landmark ? <p className="text-xs text-gray-500">Near: {address.landmark}</p> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(address._id)}
                          className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 inline-flex items-center justify-center"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => {
          setShowAddAddressModal(false);
          setShowAddressSheet(true);
        }}
        onAddressAdded={() => {
          fetchAddresses();
          setShowAddressSheet(true);
        }}
      />
    </div>
  );
};

export default Profile;
