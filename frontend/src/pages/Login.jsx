import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, setCredentials } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validatePassword, validatePhone } from '../utils/validators';
import axios from '../api/axios';
import logo from '../assets/logo.png';
import { Preferences } from '@capacitor/preferences';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });

  useEffect(() => {
    const savedPhone = localStorage.getItem('rememberedPhone') || '';
    if (savedPhone) {
      setFormData((prev) => ({ ...prev, phone: savedPhone }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'restaurant_owner':
          navigate('/dashboard');
          break;
        case 'delivery_partner':
          navigate('/delivery-dashboard');
          break;
        default:
          navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Hide navbar/footer completely
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'login-hide-layout';
    styleEl.textContent = `
      body nav,
      body footer,
      body .cart-drawer,
      [class*="Navbar"],
      [class*="Footer"],
      [class*="CartDrawer"] {
        display: none !important;
      }
      body main {
        padding-bottom: 0 !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      const el = document.getElementById('login-hide-layout');
      if (el) el.remove();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.phone || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!validatePhone(formData.phone.trim())) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!validatePassword(formData.password)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const payload = { phone: formData.phone.trim(), password: formData.password };
      const response = await axios.post('/auth/login', payload);
      const { accessToken, refreshToken, user } = response.data.data;

      // Store in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      if (rememberMe) {
        localStorage.setItem('rememberedPhone', formData.phone.trim());
      } else {
        localStorage.removeItem('rememberedPhone');
      }

      // Store in Capacitor Preferences (for mobile)
      await Preferences.set({ key: 'accessToken', value: accessToken });
      await Preferences.set({ key: 'refreshToken', value: refreshToken });

      // Update Redux state
      dispatch(setCredentials({ user, token: accessToken, refreshToken }));

      toast.success('Login successful!');
      
      // Redirect based on role
      setTimeout(() => {
        if (user.role === 'restaurant_owner') {
          navigate('/dashboard');
        } else if (user.role === 'delivery_partner') {
          navigate('/delivery-dashboard');
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-4 min-h-screen flex flex-col justify-center">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-orange-50 rounded-full mb-4">
            <img 
              src={logo} 
              alt="FlashBites" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">FlashBites</h1>
        </div>

        {/* Title Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-500 text-sm">Fresh flavors are just a tap away.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                +91
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                maxLength="10"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full pl-3 sm:pl-4 pr-3 sm:pr-4 py-3 sm:py-3.5 border border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-base"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 sm:pl-12 pr-11 sm:pr-12 py-3 sm:py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center touch-manipulation"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-orange-500 hover:text-orange-600">
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 sm:my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs sm:text-sm">
            <span className="px-3 sm:px-4 bg-white text-gray-500">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Google</span>
          </button>
          <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="font-medium text-gray-700 text-sm">Apple</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="text-center text-gray-600 text-sm">
          Don't have an account? <Link to="/register" className="text-orange-500 font-semibold">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
