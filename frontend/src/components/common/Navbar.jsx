import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingCartIcon,
  UserCircleIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { logout } from '../../redux/slices/authSlice';
import { toggleCart } from '../../redux/slices/uiSlice';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/');
  };

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
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

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Cart Icon for Mobile */}
            {isAuthenticated && (
              <button
                onClick={() => dispatch(toggleCart())}
                className="relative p-2 text-gray-700"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Hamburger Menu */}
            <button 
              className="p-2 text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/restaurants"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Restaurants
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/orders"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Orders
                  </Link>
                  
                  {user?.role === 'restaurant_owner' && (
                    <Link
                      to="/dashboard"
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                  
                  {user?.role === 'delivery_partner' && (
                    <Link
                      to="/delivery-dashboard"
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                  
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-md text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;