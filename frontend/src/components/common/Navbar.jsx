import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingCartIcon,
  UserCircleIcon,
  HomeIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { logout } from '../../redux/slices/authSlice';
import { toggleCart } from '../../redux/slices/uiSlice';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/');
  };

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white z-50">
      {/* Mobile header (no dropdown/cart) */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="px-4 h-14 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img
              src={logo}
              alt="FlashBites Logo"
              className="h-9 w-9 object-contain rounded-full"
            />
            <span className="text-lg font-bold text-primary-600 truncate">FlashBites</span>
          </Link>
        </div>
      </div>

      {/* Desktop / tablet header */}
      <div className="hidden md:block shadow-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={logo} 
              alt="FlashBites Logo" 
              className="h-12 w-12 object-contain rounded-full"
            />
            <span className="text-2xl font-bold text-primary-600">FlashBites</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/restaurants" className="text-gray-700 hover:text-primary-600 transition">
              Restaurants
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/orders" className="text-gray-700 hover:text-primary-600 transition">
                  Orders
                </Link>
                
                {user?.role === 'restaurant_owner' && (
                  <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 transition">
                    Dashboard
                  </Link>
                )}
                
                {user?.role === 'delivery_partner' && (
                  <Link to="/delivery-dashboard" className="text-gray-700 hover:text-primary-600 transition">
                    Dashboard
                  </Link>
                )}
                
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-gray-700 hover:text-primary-600 transition">
                    Admin Panel
                  </Link>
                )}

                {/* Notification Bell */}
                {isAuthenticated && <NotificationBell />}

                {/* Cart */}
                <button
                  onClick={() => dispatch(toggleCart())}
                  className="relative p-2 text-gray-700 hover:text-primary-600 transition"
                >
                  <ShoppingCartIcon className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {/* Profile Dropdown */}
                <div 
                  className="relative"
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition">
                    <UserCircleIcon className="h-6 w-6" />
                    <span>{user?.name}</span>
                  </button>
                  
                  {showDropdown && isAuthenticated && (
                    <div className="absolute right-0 mt-0 pt-2 w-48 z-50">
                      <div className="bg-white rounded-lg shadow-lg py-2 border border-gray-100">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            handleLogout();
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close desktop wrapper */}
      </div>

      {/* ── Bottom tab bar – small screens ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.25)] z-30"
        style={{ paddingBottom: 'calc(6px + var(--safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 pt-1.5 pb-1 text-[11px] text-gray-500">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 py-1 touch-feedback ${isActive('/') ? 'text-primary-600' : ''}`}
          >
            <HomeIcon className="h-6 w-6" />
            <span className="font-medium">Home</span>
            {isActive('/') && <span className="w-4 h-0.5 bg-primary-600 rounded-full" />}
          </Link>

          <Link
            to="/restaurants"
            className={`flex flex-col items-center gap-0.5 py-1 touch-feedback ${isActive('/restaurants') || isActive('/restaurant') ? 'text-primary-600' : ''}`}
          >
            <MapPinIcon className="h-6 w-6" />
            <span className="font-medium">Discover</span>
            {(isActive('/restaurants') || isActive('/restaurant')) && <span className="w-4 h-0.5 bg-primary-600 rounded-full" />}
          </Link>

          <button
            onClick={() => dispatch(toggleCart())}
            className="flex flex-col items-center gap-0.5 py-1 relative touch-feedback"
            aria-label="Cart"
          >
            <div className={cartItemCount > 0 ? 'text-primary-600' : ''}>
              <ShoppingCartIcon className="h-6 w-6" />
            </div>
            <span className="font-medium">Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute top-0 right-1/4 bg-primary-600 text-white text-[9px] rounded-full h-4 min-w-[1rem] px-0.5 flex items-center justify-center font-bold">
                {cartItemCount}
              </span>
            )}
          </button>

          <Link
            to={isAuthenticated ? '/orders' : '/login'}
            className={`flex flex-col items-center gap-0.5 py-1 touch-feedback ${isActive('/orders') ? 'text-primary-600' : ''}`}
          >
            <ShoppingBagIcon className="h-6 w-6" />
            <span className="font-medium">Orders</span>
            {isActive('/orders') && <span className="w-4 h-0.5 bg-primary-600 rounded-full" />}
          </Link>

          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className={`flex flex-col items-center gap-0.5 py-1 touch-feedback ${isActive('/profile') ? 'text-primary-600' : ''}`}
          >
            <UserCircleIcon className="h-6 w-6" />
            <span className="font-medium">{isAuthenticated ? 'Profile' : 'Login'}</span>
            {isActive('/profile') && <span className="w-4 h-0.5 bg-primary-600 rounded-full" />}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;