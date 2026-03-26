import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingCartIcon,
  UserCircleIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  BellIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as SearchIconSolid,
  ShoppingCartIcon as CartIconSolid,
  ShoppingBagIcon as OrdersIconSolid,
  UserCircleIcon as ProfileIconSolid,
} from '@heroicons/react/24/solid';
import { logout } from '../../redux/slices/authSlice';
import { toggleCart, closeCart } from '../../redux/slices/uiSlice';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import NotificationBell from './NotificationBell';
import { BRAND } from '../../constants/theme';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const { items } = useSelector((s) => s.cart);
  const { cartOpen } = useSelector((s) => s.ui);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const dropdownRef = useRef(null);

  // Enable swipe-right gesture to go back (mobile)
  useSwipeBack();

  const cartCount = isAuthenticated ? items.reduce((t, i) => t + i.quantity, 0) : 0;
  const isCustomer = !user || user.role === 'user';
  const searchRoutes = ['/', '/restaurants'];
  const shouldShowSearch = isCustomer && (searchRoutes.some((path) => location.pathname === path || location.pathname.startsWith(path + '/')) || location.pathname.startsWith('/restaurant/'));

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out');
    navigate('/');
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearch.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(mobileSearch.trim())}`);
      setShowMobileSearch(false);
      setMobileSearch('');
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    dispatch(closeCart());
  }, [location.pathname, dispatch]);

  useEffect(() => {
    // Ensure transient top search UI never leaks across pages.
    setShowMobileSearch(false);
    setMobileSearch('');
  }, [location.pathname]);

  /* ─ Nav tab definitions ─ */
  let tabs = [];
  if (user?.role === 'restaurant_owner') {
    tabs = [
      { path: '/dashboard',  label: 'Dashboard', Icon: HomeIcon,         IconS: HomeIconSolid },
      { path: '/profile',    label: 'Profile',   Icon: UserCircleIcon,   IconS: ProfileIconSolid },
    ];
  } else if (user?.role === 'delivery_partner') {
    tabs = [
      { path: '/delivery-dashboard',  label: 'Dashboard', Icon: HomeIcon,         IconS: HomeIconSolid },
      { path: '/profile',             label: 'Profile',   Icon: UserCircleIcon,   IconS: ProfileIconSolid },
    ];
  } else if (user?.role === 'admin') {
    tabs = [
      { path: '/admin',      label: 'Admin',     Icon: HomeIcon,         IconS: HomeIconSolid },
      { path: '/profile',    label: 'Profile',   Icon: UserCircleIcon,   IconS: ProfileIconSolid },
    ];
  } else {
    tabs = [
      { path: '/',           label: 'Home',    Icon: HomeIcon,         IconS: HomeIconSolid },
      { path: '/restaurants',label: 'Search',  Icon: MagnifyingGlassIcon, IconS: SearchIconSolid },
      { path: '/__cart__',   label: 'Cart',    Icon: ShoppingCartIcon, IconS: CartIconSolid, isCart: true },
      { path: '/orders',     label: 'Orders',  Icon: ShoppingBagIcon,  IconS: OrdersIconSolid },
      { path: '/profile',    label: 'Profile', Icon: UserCircleIcon,   IconS: ProfileIconSolid },
    ];
  }

  return (
    <>
      {/* ═══════════════════════════════════════
          MOBILE TOP BAR
      ═══════════════════════════════════════ */}
      <div
        className="mobile-top-nav lg:hidden fixed top-0 left-0 right-0 z-[1200]"
        style={{ 
          paddingTop: 'max(env(safe-area-inset-top), 10px)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          background: 'linear-gradient(180deg, #E8EEF7 0%, rgba(255,255,255,0.98) 46%, rgba(248,250,252,0.92) 100%)',
          boxShadow: '0 1px 0 rgba(15,23,42,0.08)',
        }}
      >
        <div
          className="mx-2 sm:mx-3 px-3 sm:px-4 flex items-center justify-between gap-2 rounded-2xl border border-gray-200"
          style={{ minHeight: '64px', background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
        >

          {/* Back button — visible on non-home pages, also supports swipe-right */}
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="icon-btn h-10 w-10 flex-shrink-0 hover:bg-gray-100"
              aria-label="Go back"
              title="Swipe right or tap to go back"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
          )}

          {/* Spacer when no back button on home */}
          {location.pathname === '/' && (
            <div className="w-10 flex-shrink-0" />
          )}

          {/* Brand logo — centre/left on mobile */}
          <div className="flex-1 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img src={logo} alt="FlashBites" className="h-7 w-7 object-contain flex-shrink-0" />
              <span
                className="text-[15px] font-black tracking-tight text-gray-900 truncate hidden xs:block"
                style={{ letterSpacing: '-0.02em' }}
              >
                FlashBites
              </span>
            </Link>
          </div>

          {/* Right icons: Search + Bell/Notifications + Cart */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search toggle (Hidden for partners/admin) */}
            {shouldShowSearch && (
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="icon-btn h-9 w-9"
              >
                <MagnifyingGlassIcon className="h-4.5 w-4.5 text-gray-600" style={{ width: '18px', height: '18px' }} />
              </button>
            )}

            {/* Notifications */}
            {isAuthenticated ? (
              <NotificationBell />
            ) : (
              <Link to="/login" className="icon-btn h-9 w-9">
                <BellIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />
              </Link>
            )}

            {/* Cart (Hidden for partners/admin) */}
            {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' && (
              <button
                onClick={() => dispatch(toggleCart())}
                className="icon-btn h-9 w-9 relative"
              >
                <ShoppingCartIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-white text-[9px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-bold"
                    style={{ background: BRAND }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expandable search bar */}
        {showMobileSearch && shouldShowSearch && (
          <div className="mx-2 sm:mx-3 mt-2 px-4 pb-3 rounded-2xl border border-gray-200 animate-slide-down" style={{ background: '#FFFFFF', boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}>
            <form onSubmit={handleMobileSearch} className="search-bar">
              <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Restaurant or dish..."
                className="bg-transparent text-gray-900 placeholder:text-gray-400"
              />
              {mobileSearch && (
                <button type="submit" className="flex-shrink-0 text-sm font-semibold" style={{ color: BRAND }}>
                  Go
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP TOP NAV
      ═══════════════════════════════════════ */}
      <div
        className="hidden lg:block sticky top-0 z-40 border-b border-gray-200"
        style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img src={logo} alt="FlashBites" className="h-9 w-9 object-contain rounded-xl" />
              <span className="text-xl font-bold text-gray-900">FlashBites</span>
            </Link>

            {/* Search */}
            {shouldShowSearch ? (
              <form
                className="flex-1 max-w-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = e.target.elements.q.value.trim();
                  if (q) navigate(`/restaurants?search=${encodeURIComponent(q)}`);
                }}
              >
                <div className="search-bar" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <MagnifyingGlassIcon className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                  <input name="q" type="text" placeholder='Search "pizza" or restaurant...' className="text-gray-900 placeholder:text-gray-400" />
                </div>
              </form>
            ) : (
              <div className="flex-1 max-w-lg"></div>
            )}




            {/* Right actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {isCustomer && (
                <Link to="/restaurants" className={`text-sm font-medium transition-colors ${isActive('/restaurants') ? 'text-brand' : 'text-gray-600 hover:text-gray-900'}`}
                  style={isActive('/restaurants') ? { color: BRAND } : {}}>
                  Restaurants
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' && (
                    <Link to="/orders" className={`text-sm font-medium transition-colors ${isActive('/orders') ? 'text-brand' : 'text-gray-600 hover:text-gray-900'}`}
                      style={isActive('/orders') ? { color: BRAND } : {}}>
                      Orders
                    </Link>
                  )}
                  {user?.role === 'restaurant_owner' && <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>}
                  {user?.role === 'delivery_partner' && <Link to="/delivery-dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>}
                  {user?.role === 'admin' && <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">Admin</Link>}

                  <NotificationBell />

                  {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' && (
                    <button onClick={() => dispatch(toggleCart())} className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors">
                      <ShoppingCartIcon className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-white text-[9px] rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center font-bold" style={{ background: BRAND }}>
                          {cartCount}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: BRAND }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span>{user?.name?.split(' ')[0]}</span>
                    </button>
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-200 py-1 z-50 animate-slide-down">
                        <Link to="/profile" onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          👤 My Profile
                        </Link>
                        <button
                          onClick={() => { setShowDropdown(false); handleLogout(); }}
                          className="w-full text-left block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          🚪 Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary py-2 px-5 text-sm rounded-xl">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE FLOATING BOTTOM NAV — Fixed, not scrollable
      ═══════════════════════════════════════ */}
      {!location.pathname.startsWith('/checkout') && !location.pathname.startsWith('/cart') && !cartOpen && (
      <div
        className="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-[1200]"
        style={{
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
          background: 'transparent',
          pointerEvents: 'none'
        }}
      >
        <div
          className="flex items-center gap-1 rounded-[28px] px-2 py-2 border border-gray-200"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 14px 30px rgba(15,23,42,0.14)',
            pointerEvents: 'auto'
          }}
        >
          {tabs.map((tab) => {
            const active = tab.isCart ? cartOpen : isActive(tab.path);
            const Icon = active ? tab.IconS : tab.Icon;
            return (
              <button
                key={tab.path}
                onClick={() => {
                  if (tab.isCart) {
                    if (!isAuthenticated) {
                      dispatch(closeCart());
                      navigate('/login');
                      return;
                    }
                    dispatch(toggleCart());
                  } else {
                    dispatch(closeCart());
                    navigate(tab.path === '/profile' && !isAuthenticated ? '/login' : tab.path);
                  }
                }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-2xl transition-all duration-200 touch-feedback`}
                style={tab.isCart ? {} : active ? { background: 'rgba(234,88,12,0.08)', boxShadow: '0 0 0 1px rgba(234,88,12,0.14)' } : {}}
              >
                {tab.isCart ? (
                  /* Cart — branded circle */
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-orange-300" style={{ background: '#F97316', boxShadow: '0 2px 8px rgba(234,88,12,0.22)' }}>
                    <ShoppingCartIcon className="h-5 w-5 text-white stroke-2" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-white text-gray-900 text-[8px] rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center font-bold border border-primary-100">
                        {cartCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Icon
                      className="h-5 w-5 transition-all"
                      style={active ? { color: '#EA580C' } : { color: '#6B7280' }}
                    />
                    <span
                      className="text-[10px] font-semibold leading-none"
                      style={active ? { color: '#C2410C' } : { color: '#6B7280' }}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
      )}
    </>
  );
};

export default Navbar;