import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, setAuthUser } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validateEmail, validatePhone, validatePassword } from '../utils/validators';
import axios from '../api/axios';
import { setupRecaptcha, sendPhoneOTP, verifyPhoneOTP } from '../firebase';
import logo from '../assets/logo.png';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, isAuthenticated, user } = useSelector((state) => state.auth);
  const recaptchaReady = useRef(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'user',
    otp: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
    const warmUp = () => {
      try {
        setupRecaptcha();
        recaptchaReady.current = true;
      } catch {
        // Retry will happen on OTP button click.
      }
    };

    const t = setTimeout(warmUp, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  // Hide navbar/footer completely
  useEffect(() => {
    // Add style to hide layout elements
    const styleEl = document.createElement('style');
    styleEl.id = 'register-hide-layout';
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
      // Cleanup when component unmounts
      const el = document.getElementById('register-hide-layout');
      if (el) el.remove();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.password || !formData.phone) {
      toast.error('Please fill in name, phone, and password');
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Please enter a valid email');
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!validatePassword(formData.password)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (!recaptchaReady.current) setupRecaptcha();
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP sent to your phone number');
      setStep(2);
      setResendCountdown(30);
    } catch (error) {
      console.error('Send OTP error:', error);
      recaptchaReady.current = false;
      if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else if (error.code === 'auth/invalid-phone-number') {
        toast.error('Invalid phone number format');
      } else {
        toast.error(error.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const firebaseToken = await verifyPhoneOTP(formData.otp);
      const { confirmPassword, otp, ...dataToSend } = formData;
      dataToSend.firebaseToken = firebaseToken;
      const response = await axios.post('/auth/register', dataToSend);

      // Store tokens and user data
      const { accessToken, refreshToken, user: userData } = response.data.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      dispatch(setAuthUser({ user: userData, token: accessToken }));

      toast.success('Registration successful!');

      if (userData.role === 'restaurant_owner') {
        navigate('/dashboard');
      } else if (userData.role === 'delivery_partner') {
        navigate('/delivery-dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      if (error.code?.startsWith('auth/')) {
        toast.error('Invalid OTP. Please try again.');
        return;
      }

      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      
      // If phone already registered, suggest login
      if (errorMessage.includes('Phone number already registered')) {
        toast.error('This phone number is already in use. Please login or use a different number.', {
          duration: 5000
        });
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
      
      // If email already registered (fully), redirect to login
      if (errorMessage.includes('User already exists')) {
        toast.error('This account already exists. Redirecting to login...', {
          duration: 3000
        });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      if (!recaptchaReady.current) setupRecaptcha();
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP resent to your phone');
      setResendCountdown(30);
    } catch (error) {
      recaptchaReady.current = false;
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    // Clear OTP when going back
    setFormData({ ...formData, otp: '' });
    setStep(1);
    toast.info('You can modify your details now');
  };

  // Google OAuth - COMMENTED OUT
  // const handleGoogleLogin = () => {
  //   const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  //   const baseUrl = apiUrl.replace('/api', '');
  //   window.location.href = `${baseUrl}/api/auth/google`;
  // };

  // Step 1: Registration Form
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-4 min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8 pt-2">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 touch-manipulation">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img 
                src={logo} 
                alt="FlashBites" 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
              <span className="text-lg sm:text-xl font-semibold text-gray-900">FlashBites</span>
            </div>
            <div className="w-10"></div>
          </div>

          {/* Title Section */}
          <div className="mb-5 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-500 text-sm">Join FlashBites and get fresh meals delivered fast.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSendOTP} className="space-y-3.5 sm:space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full pl-11 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-base"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full pl-11 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-base"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="1234567890"
                  maxLength="10"
                  className="w-full pl-11 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-base"
                />
              </div>
            </div>

            {/* I want to */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-900 mb-2">
                I want to
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-white text-base"
              >
                <option value="user">Order Food</option>
                <option value="restaurant_owner">Register My Restaurant</option>
                <option value="delivery_partner">Become a Delivery Partner</option>
              </select>
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
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

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2.5 sm:gap-3 pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 touch-manipulation"
              />
              <label className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                I agree to the <a href="#" className="text-orange-500 font-medium">Terms of Service</a> and <a href="#" className="text-orange-500 font-medium">Privacy Policy</a>.
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {loading ? 'Sending OTP...' : 'Sign Up'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-3 sm:px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="flex gap-3 sm:gap-4 mb-5 sm:mb-6">
            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-gray-700 text-xs sm:text-sm">Google</span>
            </button>
            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium text-gray-700 text-xs sm:text-sm">Apple</span>
            </button>
          </div>

          {/* Login Link */}
        <div className="text-center text-gray-600 text-xs sm:text-sm pb-6 sm:pb-8">
          Already have an account? <Link to="/login" className="text-orange-500 font-semibold">Log In</Link>
        </div>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
  }

  // Step 2: OTP Verification
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-4 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 pt-2">
          <button onClick={handleGoBack} className="p-2 -ml-2 touch-manipulation">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="FlashBites" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
            <span className="text-lg sm:text-xl font-semibold text-gray-900">FlashBites</span>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Verify Phone</h1>
          <p className="text-gray-500 text-sm">Enter the OTP sent to +91 {formData.phone}</p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleRegister} className="space-y-5 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Enter OTP</label>
            <input
              id="otp"
              name="otp"
              type="text"
              maxLength="6"
              required
              value={formData.otp}
              onChange={handleChange}
              placeholder="000000"
              className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl text-center text-xl sm:text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading ? 'Verifying...' : 'Verify & Register'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={loading || resendCountdown > 0}
              className="text-orange-500 hover:text-orange-600 font-medium text-sm disabled:opacity-50 touch-manipulation"
            >
              {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default Register;
