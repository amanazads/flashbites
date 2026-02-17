import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validateEmail, validatePhone, validatePassword } from '../utils/validators';
import axios from '../api/axios';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1); // 1: details, 2: OTP verification
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'user',
    otp: ''
  });

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!validateEmail(formData.email)) {
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
      const response = await axios.post('/auth/send-otp', {
        email: formData.email,
        purpose: 'registration'
      });

      toast.success(response.data.message || 'OTP sent to your email');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
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
      const { confirmPassword, ...dataToSend } = formData;
      const response = await axios.post('/auth/register', dataToSend);

      // Store tokens and user data
      const { accessToken, refreshToken, user } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      toast.success('Registration successful!');
      
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
    setLoading(true);
    try {
      await axios.post('/auth/send-otp', {
        email: formData.email,
        purpose: 'registration'
      });
      toast.success('OTP resent to your email');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(errorMessage);
      
      // If email already fully registered, redirect to login
      if (errorMessage.includes('already registered')) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Create your account
            </h2>
            <p className="text-sm text-gray-600">
              {step === 1 ? 'Fill in your details' : 'Verify your email with OTP'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center items-center space-x-4 my-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
          </div>

          {/* Step 1: Registration Form */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="mt-8 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="10-digit phone number"
                  maxLength="10"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Confirm your password"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  I want to
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="user">Order Food</option>
                  <option value="restaurant_owner">Register My Restaurant</option>
                  <option value="delivery_partner">Become a Delivery Partner</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>

              {/* Google OAuth - COMMENTED OUT */}
              {/* <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button> */}
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="mt-8 space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength="6"
                  required
                  value={formData.otp}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="000000"
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  OTP sent to {formData.email}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Register'}
              </button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="text-gray-600 hover:text-orange-500"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-orange-500 hover:text-orange-600 disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
