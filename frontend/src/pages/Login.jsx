import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const BRAND = '#96092B';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector((s) => s.auth);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const roleMap = { admin: '/admin', restaurant_owner: '/dashboard', delivery_partner: '/delivery-dashboard' };
      navigate(roleMap[user.role] || '/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) { toast.error('Please fill in all fields'); return; }
    await dispatch(login(formData));
  };

  return (
    <div className="min-h-screen flex items-stretch" style={{ background: '#ECEEF3' }}>
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-white">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10"
          style={{ background: BRAND }} />
        <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: '#000000' }} />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-8"
          style={{ background: '#000000' }} />

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-10">
            <img src={logo} alt="FlashBites" className="h-14 w-14 rounded-2xl shadow-md" />
            <span className="text-3xl font-extrabold text-brand-gradient">FlashBites</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Food you love,{' '}
            <span style={{ color: BRAND }}>delivered</span>
          </h1>
          <p className="text-gray-400 leading-relaxed mb-10 text-base">
            Hundreds of restaurants, thousands of dishes — at your fingertips.
          </p>
          <div className="flex flex-col gap-3 items-start">
            {[
              { icon: '⚡', t: '30-min delivery guaranteed' },
              { icon: '🍽️', t: '500+ top restaurants' },
              { icon: '💯', t: 'Real-time order tracking' },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#fcf0f3' }}>
                  {f.icon}
                </div>
                <span className="text-sm font-medium text-gray-600">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <img src={logo} alt="FlashBites" className="h-10 w-10 rounded-xl shadow" />
            <span className="text-2xl font-extrabold text-brand-gradient">FlashBites</span>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10"
            style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.07)' }}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back 👋</h2>
            <p className="text-sm text-gray-400 mb-7">
              New here?{' '}
              <Link to="/register" className="font-semibold" style={{ color: BRAND }}>Create an account</Link>
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com" className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password" name="password" type={showPass ? 'text' : 'password'}
                    autoComplete="current-password" required
                    value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password" className="input-field pr-14"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded" style={{ accentColor: BRAND }} />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm font-semibold" style={{ color: BRAND }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-1">
                {loading ? (
                  <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in...</span>
                ) : 'Sign in →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;