import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    const result = await dispatch(login(formData));
    
    if (login.fulfilled.match(result)) {
      toast.success('Login successful!');
    } else if (login.rejected.match(result)) {
      const errorMsg = result.payload || result.error?.message || 'Login failed';
      
      // Check if user signed up with Google OAuth
      if (errorMsg.includes('Google Sign-In') || errorMsg.includes('Continue with Google')) {
        toast.error(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Google Account Detected</span>
            <span className="text-sm">{errorMsg}</span>
          </div>,
          {
            duration: 6000,
            icon: '🔐',
            style: {
              maxWidth: '400px',
            }
          }
        );
      }
      // Check if user not found (404 status)
      else if (errorMsg.includes('No account found') || errorMsg.includes('not found')) {
        toast.error('No account found with this email', {
          duration: 5000,
          icon: '🔍'
        });
        // Show a helpful suggestion after a short delay
        setTimeout(() => {
          toast((t) => (
            <div className="flex flex-col gap-2">
              <span>Don't have an account?</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/register');
                }}
                className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
              >
                Sign Up Now
              </button>
            </div>
          ), {
            duration: 8000,
          });
        }, 1000);
      } else {
        toast.error(errorMsg, {
          duration: 4000,
        });
      }
    }
  };

  // Google OAuth - COMMENTED OUT
  // const handleGoogleLogin = () => {
  //   const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  //   const baseUrl = apiUrl.replace('/api', ''); // Remove /api suffix to get base URL
  //   window.location.href = `${baseUrl}/api/auth/google`;
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Sign in to FlashBites
            </h2>
            <p className="text-sm text-gray-600">
              Or{' '}
              <Link to="/register" className="text-orange-500 hover:text-orange-600 font-medium">
                create a new account
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mt-1"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mt-1"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="text-orange-500 hover:text-orange-600 font-medium">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
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
              Sign in with Google
            </button> */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;