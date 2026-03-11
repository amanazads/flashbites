import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, setAuthUser } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validatePhone, validatePassword } from '../utils/validators';
import axios from '../api/axios';
import { setupRecaptcha, sendPhoneOTP, verifyPhoneOTP } from '../firebase';
import logo from '../assets/logo.png';

const BRAND = '#E23744';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const recaptchaReady = useRef(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', role: 'user', otp: '',
  });

  // Pre-warm reCAPTCHA
  useEffect(() => {
    const t = setTimeout(() => {
      try { setupRecaptcha(); recaptchaReady.current = true; } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  // Hide navbar/footer
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'register-hide-layout';
    styleEl.textContent = `
      body nav, body footer, body .cart-drawer,
      [class*="Navbar"], [class*="Footer"], [class*="CartDrawer"] { display: none !important; }
      body main { padding-bottom: 0 !important; }
    `;
    document.head.appendChild(styleEl);
    return () => { document.getElementById('register-hide-layout')?.remove(); };
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.password) {
      toast.error('Please fill in name, phone, and password'); return;
    }
    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number'); return;
    }
    if (!validatePassword(formData.password)) {
      toast.error('Password must be at least 6 characters, with one uppercase, one lowercase, and one special character'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    setLoading(true);
    try {
      if (!recaptchaReady.current) setupRecaptcha();
      await sendPhoneOTP(`+91${formData.phone}`);
      toast.success('OTP sent to your phone number');
      setStep(2);
      setResendCountdown(30);
    } catch (error) {
      recaptchaReady.current = false;
      if (error.code === 'auth/too-many-requests') toast.error('Too many attempts. Please try again later.');
      else if (error.code === 'auth/invalid-phone-number') toast.error('Invalid phone number format');
      else toast.error(error.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter valid 6-digit OTP'); return;
    }
    setLoading(true);
    try {
      const firebaseToken = await verifyPhoneOTP(formData.otp);
      const { confirmPassword, otp, ...dataToSend } = formData;
      dataToSend.firebaseToken = firebaseToken;
      const response = await axios.post('/auth/register', dataToSend);
      const { accessToken, refreshToken, user: userData } = response.data.data;

      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      if (window.Capacitor) {
        try {
          const { Preferences: P } = await import('@capacitor/preferences');
          await P.set({ key: 'token', value: accessToken });
          await P.set({ key: 'accessToken', value: accessToken });
          await P.set({ key: 'refreshToken', value: refreshToken });
        } catch {}
      }

      dispatch(setAuthUser({ user: userData, token: accessToken }));
      toast.success('Welcome to FlashBites! 🎉');

      const roleMap = { restaurant_owner: '/dashboard', delivery_partner: '/delivery-dashboard' };
      navigate(roleMap[userData.role] || '/');
    } catch (error) {
      if (error.code?.startsWith('auth/')) { toast.error('Invalid OTP. Please try again.'); return; }
      const msg = error.response?.data?.message || 'Registration failed';
      toast.error(msg);
      if (msg.includes('already')) {
        setTimeout(() => navigate('/login'), 2500);
      }
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      setupRecaptcha(); recaptchaReady.current = true;
      await sendPhoneOTP(`+91${formData.phone}`);
      toast.success('OTP resent');
      setResendCountdown(30);
    } catch (error) {
      recaptchaReady.current = false;
      toast.error(error.message || 'Failed to resend OTP');
    } finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-base";

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="FlashBites" className="w-8 h-8 object-contain" />
            <span className="text-lg font-semibold text-gray-900">FlashBites</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-orange-500" />
          <div className="flex-1 h-1.5 rounded-full" style={{ background: step >= 2 ? '#F97316' : '#E5E7EB' }} />
        </div>

        {step === 1 ? (
          <>
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
              <p className="text-gray-500 text-sm">Join FlashBites and get fresh meals delivered fast.</p>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Full Name</label>
                <input name="name" type="text" required value={formData.name} onChange={handleChange}
                  placeholder="John Doe" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Email Address <span className="text-gray-400 text-xs">(optional)</span></label>
                <input name="email" type="email" value={formData.email} onChange={handleChange}
                  placeholder="name@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">+91</span>
                  <input name="phone" type="tel" required maxLength="10" value={formData.phone} onChange={handleChange}
                    placeholder="10-digit mobile" className={`${inputClass} rounded-l-none flex-1`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">I want to</label>
                <select name="role" value={formData.role} onChange={handleChange} className={inputClass}>
                  <option value="user">Order Food 🍕</option>
                  <option value="restaurant_owner">Register My Restaurant 🏪</option>
                  <option value="delivery_partner">Become a Delivery Partner 🛵</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Password</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} required
                    value={formData.password} onChange={handleChange}
                    placeholder="Min 6 characters" className={`${inputClass} pr-11`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Confirm Password</label>
                <input name="confirmPassword" type={showPassword ? 'text' : 'password'} required
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Re-enter password" className={inputClass} />
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                <label className="text-xs text-gray-700 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-orange-500 font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-orange-500 font-medium">Privacy Policy</Link>
                </label>
              </div>

              <button type="submit" disabled={loading || !agreedToTerms}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </button>

              <p className="text-center text-gray-600 text-sm pb-4">
                Already have an account?{' '}
                <Link to="/login" className="text-orange-500 font-semibold">Log In</Link>
              </p>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Verify Phone</h1>
              <p className="text-gray-500 text-sm">Enter the OTP sent to +91 {formData.phone}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Enter OTP</label>
                <input name="otp" type="text" maxLength="6" required autoFocus
                  value={formData.otp} onChange={handleChange}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Verifying...' : 'Verify & Register'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={handleResendOTP}
                  disabled={loading || resendCountdown > 0}
                  className="font-semibold disabled:opacity-40" style={{ color: BRAND }}>
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
                </button>
                <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">
                  ← Change Details
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />
    </div>
  );
};

export default Register;