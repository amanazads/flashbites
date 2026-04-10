import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';
import { BRAND } from '../constants/theme';
const HERO_IMAGE = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&q=80';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector((s) => s.auth);
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const lastErrorRef = useRef('');

  useEffect(() => {
    if (isAuthenticated && user) {
      const roleMap = { admin: '/admin', restaurant_owner: '/dashboard', delivery_partner: '/delivery-dashboard' };
      navigate(roleMap[user.role] || '/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      toast.error(error, { id: 'auth-login-error' });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = formData.phone.trim();
    const password = formData.password;

    if (!phone && !password) {
      toast.error('Please enter your phone number and password');
      return;
    }

    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }

    if (phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    await dispatch(login(formData));
  };

  return (
    <div className="auth-page-shell min-h-screen flex items-stretch" style={{ background: '#F6F1F1' }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-[#F8F3F2]">
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10" style={{ background: BRAND }} />
        <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full blur-3xl opacity-15" style={{ background: BRAND }} />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-8" style={{ background: BRAND }} />

        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-lg bg-white border border-[#EEE4E4] flex items-center justify-center">
              <img src={logo} alt="FlashBites" className="h-10 w-10 object-contain" />
            </div>
            <span className="text-4xl font-black text-[#201A1C] tracking-[-0.02em]">FlashBites</span>
          </div>

          <p className="text-[#4B4346] text-lg mb-6">Deliciously fast, curated for you.</p>

          <div className="rounded-[2rem] overflow-hidden shadow-[0_18px_42px_rgba(38,24,27,0.15)] mb-8">
            <img src={HERO_IMAGE} alt="Curated meal" className="w-full h-[280px] object-cover" />
          </div>

          <div className="text-left inline-flex flex-col gap-3">
            {[
              { icon: '⚡', t: 'Quick delivery' },
              { icon: '🍽️', t: 'Curated restaurants' },
              { icon: '📍', t: 'Live order tracking' },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: '#FFF0ED' }}>
                  {f.icon}
                </div>
                <span className="text-sm font-medium text-[#5B5256]">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-shell flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
            <div className="w-10 h-10 rounded-md bg-white border border-[#EEE4E4] flex items-center justify-center">
              <img src={logo} alt="FlashBites" className="h-7 w-7 object-contain" />
            </div>
            <span className="text-2xl font-black text-[#201A1C]">FlashBites</span>
          </div>

          <div className="auth-surface p-5 sm:p-8">
            <h2 className="text-[1.7rem] sm:text-[2rem] font-black text-[#201A1C] leading-tight mb-1">Welcome back</h2>
            <p className="text-sm text-[#6B6064] mb-7">
              New here?{' '}
              <Link to="/register" className="font-semibold" style={{ color: BRAND }}>Create an account</Link>
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Phone Number</label>
                <div className="auth-input-base flex overflow-hidden">
                  <span className="inline-flex items-center px-4 text-[#2B2426] text-sm font-semibold">+91</span>
                  <span className="inline-flex items-center px-2 text-[#7B6E72]">⌄</span>
                  <span className="my-3 w-px bg-[#DCCFCF]" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    maxLength="10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="Phone number"
                    className="flex-1 bg-transparent px-4 text-[14px] sm:text-[15px] text-[#3A3235] placeholder:text-[#AA9EA2] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="auth-input-base px-4 pr-16 text-[14px] sm:text-[15px] placeholder:text-[#AA9EA2] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.06em] text-[#8A7E82]"
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-[#5B5256] cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded" style={{ accentColor: BRAND }} />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm font-semibold" style={{ color: BRAND }}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] sm:h-[60px] rounded-[1.25rem] sm:rounded-[2rem] text-white text-base sm:text-xl font-extrabold transition-all disabled:opacity-70"
                style={{ background: BRAND, boxShadow: '0 12px 28px rgba(234,88,12,0.24)' }}
              >
                {loading ? 'Signing in...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;