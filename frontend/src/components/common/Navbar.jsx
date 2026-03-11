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
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as SearchIconSolid,
  ShoppingCartIcon as CartIconSolid,
  ShoppingBagIcon as OrdersIconSolid,
  UserCircleIcon as ProfileIconSolid,
} from '@heroicons/react/24/solid';
import { logout } from '../../redux/slices/authSlice';
import { toggleCart } from '../../redux/slices/uiSlice';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import NotificationBell from './NotificationBell';

const BRAND = '#96092B';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const { items } = useSelector((s) => s.cart);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const dropdownRef = useRef(null);

  const cartCount = items.reduce((t, i) => t + i.quantity, 0);

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

  const isProfilePage = location.pathname === '/profile';
  const isHomePage = location.pathname === '/';

  return (
    <>
      {/* ═══════════════════════════════════════
          MOBILE TOP BAR
      ═══════════════════════════════════════ */}
      {!isProfilePage && (
      <div
        className="lg:hidden sticky top-0 z-40 bg-white"
        style={{ 
          boxShadow: '0 1px 0 #E5E7EB',
          paddingTop: 'var(--safe-area-inset-top, env(safe-area-inset-top))'
        }}
      >
        <div className="px-4 flex items-center justify-between gap-2"
          style={{ minHeight: '60px' }}>
          {/* Back button — visible on non-home pages */}
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="icon-btn h-9 w-9 flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
          )}

          {/* Brand logo — centre/left on mobile */}
          <div className="flex-1 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img src={logo} alt="FlashBites" className="h-7 w-auto flex-shrink-0" />
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
            {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' && (
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
        {showMobileSearch && (
          <div className="px-4 pb-3 animate-slide-down">
            <form onSubmit={handleMobileSearch} className="search-bar">
              <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Restaurant or dish..."
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
      )}

      {/* ═══════════════════════════════════════
          DESKTOP TOP NAV
      ═══════════════════════════════════════ */}
      {!isProfilePage && (
      <div
        className="hidden lg:block sticky top-0 z-40 bg-white"
        style={{ boxShadow: '0 1px 0 #E5E7EB' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img src={logo} alt="FlashBites" className="h-9 w-9 object-contain rounded-xl" />
              <span className="text-xl font-bold text-brand-gradient">FlashBites</span>
            </Link>

            {/* Search */}
            {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' ? (
              <form
                className="flex-1 max-w-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = e.target.elements.q.value.trim();
                  if (q) navigate(`/restaurants?search=${encodeURIComponent(q)}`);
                }}
              >
                <div className="search-bar">
                  <MagnifyingGlassIcon className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                  <input name="q" type="text" placeholder='Search "pizza" or restaurant...' />
                </div>
              </form>
            ) : (
              <div className="flex-1 max-w-lg"></div>
            )}




            {/* Right actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' && (
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
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 animate-slide-down">
                        <Link to="/profile" onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors">
                          👤 My Profile
                        </Link>
                        <button
                          onClick={() => { setShowDropdown(false); handleLogout(); }}
                          className="w-full text-left block px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
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
      )}

      {/* ═══════════════════════════════════════
          MOBILE FLOATING BOTTOM NAV
      ═══════════════════════════════════════ */}
      {isProfilePage ? (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
          style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-4 px-2 py-2">
            {tabs.filter((tab) => !tab.isCart).map((tab) => {
              const active = isActive(tab.path);
              const Icon = active ? tab.IconS : tab.Icon;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path === '/profile' && !isAuthenticated ? '/login' : tab.path)}
                  className="flex flex-col items-center justify-center gap-1 py-1"
                >
                  <Icon
                    className="h-5 w-5"
                    style={active ? { color: '#F97316' } : { color: '#94A3B8' }}
                  />
                  <span
                    className="text-[10px] leading-none font-medium"
                    style={active ? { color: '#F97316' } : { color: '#94A3B8' }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
          style={{
            paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            paddingLeft: '12px',
            paddingRight: '12px',
            background: 'transparent',
          }}
        >
          <div
            className="bg-white flex items-center gap-1 rounded-[28px] px-2 py-2"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
          >
            {tabs.map((tab) => {
              const active = tab.isCart ? false : isActive(tab.path);
              const Icon = active ? tab.IconS : tab.Icon;
              return (
                <button
                  key={tab.path}
                  onClick={() => {
                    if (tab.isCart) dispatch(toggleCart());
                    else navigate(tab.path === '/profile' && !isAuthenticated ? '/login' : tab.path);
                  }}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-2xl transition-all duration-200 touch-feedback ${
                    tab.isCart ? '' : active ? '' : ''
                  }`}
                  style={tab.isCart ? {} : active ? { background: '#fcf0f3' } : {}}
                >
                  {tab.isCart ? (
                    /* Cart — branded circle */
                    <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl" style={{ background: BRAND }}>
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
                        style={active ? { color: BRAND } : { color: '#9CA3AF' }}
                      />
                      <span
                        className="text-[10px] font-semibold leading-none"
                        style={active ? { color: BRAND } : { color: '#9CA3AF' }}
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
