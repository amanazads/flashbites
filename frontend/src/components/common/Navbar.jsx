import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { logout } from '../../redux/slices/authSlice';
import { toggleCart, closeCart } from '../../redux/slices/uiSlice';
import * as authApi from '../../api/authApi';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const cartCount = isAuthenticated ? items.reduce((t, i) => t + i.quantity, 0) : 0;
  const isCustomer = !user || user.role === 'user';
  const searchRoutes = ['/', '/restaurants'];
  const shouldShowSearch = isCustomer && (searchRoutes.some((path) => location.pathname === path || location.pathname.startsWith(path + '/')) || location.pathname.startsWith('/restaurant/'));

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue local logout even if server logout fails.
    }
    dispatch(logout());
    toast.success('Logged out');
    navigate('/');
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

  return (
    <>
      {/* ═══════════════════════════════════════
          DESKTOP TOP NAV
      ═══════════════════════════════════════ */}
      <div
        className="hidden lg:block sticky top-0 z-40 border-b border-gray-200"
        style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-[12px]">
          <div className="flex items-center justify-between h-16 gap-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img src={logo} alt="FlashBites" className="h-9 w-9 object-contain rounded-xl" />
              <span className="text-base font-bold text-gray-900">FlashBites</span>
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
                <Link to="/restaurants" className={`text-[11px] font-medium transition-colors ${isActive('/restaurants') ? 'text-brand' : 'text-gray-600 hover:text-gray-900'}`}
                  style={isActive('/restaurants') ? { color: BRAND } : {}}>
                  Restaurants
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  {user?.role !== 'restaurant_owner' && user?.role !== 'delivery_partner' && user?.role !== 'admin' && (
                    <Link to="/orders" className={`text-[11px] font-medium transition-colors ${isActive('/orders') ? 'text-brand' : 'text-gray-600 hover:text-gray-900'}`}
                      style={isActive('/orders') ? { color: BRAND } : {}}>
                      Orders
                    </Link>
                  )}
                  {user?.role === 'restaurant_owner' && <Link to="/dashboard" className="text-[11px] text-gray-600 hover:text-gray-900">Dashboard</Link>}
                  {user?.role === 'delivery_partner' && <Link to="/delivery-dashboard" className="text-[11px] text-gray-600 hover:text-gray-900">Dashboard</Link>}
                  {user?.role === 'admin' && <Link to="/admin" className="text-[11px] text-gray-600 hover:text-gray-900">Admin</Link>}

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
                      className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: BRAND }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-[11px]">{user?.name?.split(' ')[0]}</span>
                    </button>
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-200 py-1 z-50 animate-slide-down">
                        <Link to="/profile" onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors">
                          👤 My Profile
                        </Link>
                        <button
                          onClick={() => { setShowDropdown(false); handleLogout(); }}
                          className="w-full text-left block px-4 py-2.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          🚪 Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary py-2 px-5 text-[11px] rounded-xl">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;