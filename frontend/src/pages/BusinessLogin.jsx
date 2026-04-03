import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { clearError, setAuthUser } from '../redux/slices/authSlice';
import { businessLogin } from '../api/authApi';

const roleConfig = {
  restaurant_owner: {
    title: 'Restaurant Login',
    subtitle: 'Login to your restaurant account',
    registerTo: '/accounts/restaurant/register',
    dashboard: '/dashboard',
  },
  delivery_partner: {
    title: 'Delivery Partner Login',
    subtitle: 'Login to your delivery partner account',
    registerTo: '/accounts/delivery/register',
    dashboard: '/delivery-dashboard',
  },
};

const BusinessLogin = ({ role }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', password: '' });

  const config = roleConfig[role] || roleConfig.restaurant_owner;

  useEffect(() => {
    if (user && user.role === role) {
      navigate(config.dashboard, { replace: true });
    }
  }, [user, role, config.dashboard, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const identifier = formData.identifier.trim();
    const payload = {
      password: formData.password,
      expectedRole: role,
    };

    if (/^\d{10}$/.test(identifier)) {
      payload.phone = identifier;
    } else {
      payload.email = identifier.toLowerCase();
    }

    setLoading(true);
    try {
      const response = await businessLogin(payload);
      const { accessToken, refreshToken, user: userData } = response.data;
      const sessionStartedAt = String(Date.now());

      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('sessionStartedAt', sessionStartedAt);

      dispatch(setAuthUser({ user: userData, token: accessToken }));
      toast.success('Login successful');
      navigate(config.dashboard);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        <p className="text-sm text-gray-600 mt-1">{config.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone or Email</label>
            <input
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="10-digit phone or email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Need an account?{' '}
          <Link to={config.registerTo} className="text-primary-600 font-semibold hover:text-primary-700">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default BusinessLogin;
