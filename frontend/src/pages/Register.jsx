import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, setAuthUser } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validateEmail, validatePhone, validatePassword } from '../utils/validators';
import axios from '../api/axios';
import { setupRecaptcha, sendPhoneOTP, verifyPhoneOTP, getReadableFirebaseAuthError } from '../firebase';
import logo from '../assets/logo.png';

const BRAND = '#FF523B';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, isAuthenticated, user } = useSelector((state) => state.auth);
  const recaptchaReady = useRef(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  /* Pre-warm reCAPTCHA as soon as the page loads — saves 2-3s on OTP send */
  useEffect(() => {
    const warmUp = () => {
      try {
        setupRecaptcha();
        recaptchaReady.current = true;
      } catch (e) {
        // Will retry on button click
      }
    };
    // Give the DOM a tick to render the #recaptcha-container
    const t = setTimeout(warmUp, 300);
    return () => clearTimeout(t);
  }, []);

  /* Resend countdown timer */
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone' || name === 'otp') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData({ ...formData, [name]: digitsOnly });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const getRegistrationValidationError = () => {
    if (!formData.name?.trim()) {
      return 'Please enter your full name';
    }
    if (formData.name.trim().length < 2) {
      return 'Full name should be at least 2 characters';
    }
    if (!formData.phone) {
      return 'Please enter your phone number';
    }
    if (!validatePhone(formData.phone)) {
      return 'Please enter a valid 10-digit phone number';
    }
    if (formData.email && !validateEmail(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (!formData.password) {
      return 'Please enter a password';
    }
    if (!validatePassword(formData.password)) {
      return 'Password must be at least 6 characters, with one uppercase, one lowercase, and one special character';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  const passwordRules = {
    minLength: (formData.password || '').length >= 6,
    uppercase: /[A-Z]/.test(formData.password || ''),
    lowercase: /[a-z]/.test(formData.password || ''),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password || '')
  };

  const passwordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = Boolean(formData.confirmPassword) && formData.password === formData.confirmPassword;

  const handleSendOTP = async (e) => {
    e.preventDefault();

    const validationError = getRegistrationValidationError();
    if (validationError) {
      const isPasswordValidation = validationError.toLowerCase().includes('password');
      if (isPasswordValidation) {
        setShowPasswordGuide(true);
        return;
      }
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      // Ensure reCAPTCHA is ready (may already be pre-warmed)
      if (!recaptchaReady.current || !window.recaptchaVerifier) {
        setupRecaptcha();
        recaptchaReady.current = true;
      }
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP sent to your phone number');
      setStep(2);
      setResendCountdown(30); // 30s before resend allowed
    } catch (error) {
      console.error('Send OTP error:', error);
      recaptchaReady.current = false; // reset so next click re-inits
      toast.error(getReadableFirebaseAuthError(error));
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
      let firebaseToken = null;
      try {
        // Verify OTP with Firebase and get ID token
        firebaseToken = await verifyPhoneOTP(formData.otp);
      } catch (firebaseError) {
        toast.error(getReadableFirebaseAuthError(firebaseError));
        return;
      }

      // Register with backend using Firebase token
      const response = await axios.post('/auth/register', {
        name: formData.name.trim(),
        phone: formData.phone,
        password: formData.password,
        email: formData.email?.trim() || undefined,
        firebaseToken,
      });

      // Destructure tokens and user data from the response
      const { accessToken, refreshToken, user: userData } = response.data.data;

      // Store in localStorage (web) — always set for compatibility
      const sessionStartedAt = String(Date.now());
      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('sessionStartedAt', sessionStartedAt);

      // Also store in Capacitor Preferences so native app sessions persist
      if (window.Capacitor) {
        try {
          const { Preferences: P } = await import('@capacitor/preferences');
          await P.set({ key: 'token', value: accessToken });
          await P.set({ key: 'accessToken', value: accessToken });
          await P.set({ key: 'refreshToken', value: refreshToken });
          await P.set({ key: 'sessionStartedAt', value: sessionStartedAt });
        } catch (e) {
          // Non-critical — localStorage fallback is already set
        }
      }

      // Immediately update Redux auth state — user is now logged in
      dispatch(setAuthUser({ user: userData, token: accessToken }));


      toast.success('Welcome to FlashBites! 🎉');

      // Redirect based on role
      const roleMap = { restaurant_owner: '/dashboard', delivery_partner: '/delivery-dashboard' };
      navigate(roleMap[userData.role] || '/');
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || 'Could not create your account right now. Please try again.';
      toast.error(errorMessage);

      if (errorMessage.includes('Phone number already registered') || errorMessage.includes('already registered')) {
        setTimeout(() => navigate('/login'), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      setupRecaptcha();
      recaptchaReady.current = true;
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP resent to your phone');
      setResendCountdown(30);
    } catch (error) {
      recaptchaReady.current = false;
      toast.error(getReadableFirebaseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch" style={{ background: '#F8F6F5' }}>
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-white">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10"
          style={{ background: BRAND }} />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-8"
          style={{ background: BRAND }} />

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-10">
            <img src={logo} alt="FlashBites" className="h-14 w-14 rounded-2xl shadow-md" />
            <span className="text-3xl font-extrabold text-brand-gradient">FlashBites</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Join <span style={{ color: BRAND }}>FlashBites</span>
          </h1>
          <p className="text-gray-400 leading-relaxed mb-10 text-base">
            Create your account and start ordering from the best restaurants near you.
          </p>
          <div className="flex flex-col gap-3 items-start">
            {[
              { icon: '📱', t: 'Quick phone verification' },
              { icon: '🍽️', t: '500+ top restaurants' },
              { icon: '🚀', t: 'Fast & free delivery' },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#FFF0ED' }}>
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

            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              {step === 1 ? 'Create account 🚀' : 'Verify phone 📱'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {step === 1 ? (
                <>Already have an account? <Link to="/login" className="font-semibold" style={{ color: BRAND }}>Sign in</Link></>
              ) : (
                <>Enter the 6-digit OTP sent to <span className="font-semibold text-gray-700">+91 {formData.phone}</span></>
              )}
            </p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: BRAND }} />
              <div className="flex-1 h-1.5 rounded-full" style={{ background: step >= 2 ? BRAND : '#E5E7EB' }} />
            </div>

            {/* Step 1: Details */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input name="name" type="text" required value={formData.name} onChange={handleChange}
                    placeholder="Your full name" className="input-field" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                      +91
                    </span>
                    <input name="phone" type="tel" required maxLength="10" value={formData.phone} onChange={handleChange}
                      placeholder="10-digit mobile number" className="input-field rounded-l-none flex-1" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email <span className="text-gray-300">(optional)</span></label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange}
                    placeholder="you@example.com" className="input-field" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setShowPasswordGuide(true)}
                      placeholder="Min 6 characters"
                      className="input-field pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onFocus={() => setShowPasswordGuide(true)}
                      placeholder="Re-enter password"
                      className="input-field pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {showPasswordGuide && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs space-y-1">
                    <p className="font-semibold text-gray-700">Password requirements</p>
                    <p className={passwordRules.minLength ? 'text-green-600' : 'text-gray-500'}>
                      {passwordRules.minLength ? '✓' : '•'} At least 6 characters
                    </p>
                    <p className={passwordRules.uppercase ? 'text-green-600' : 'text-gray-500'}>
                      {passwordRules.uppercase ? '✓' : '•'} One uppercase letter
                    </p>
                    <p className={passwordRules.lowercase ? 'text-green-600' : 'text-gray-500'}>
                      {passwordRules.lowercase ? '✓' : '•'} One lowercase letter
                    </p>
                    <p className={passwordRules.special ? 'text-green-600' : 'text-gray-500'}>
                      {passwordRules.special ? '✓' : '•'} One special character
                    </p>
                    {formData.confirmPassword && (
                      <p className={passwordsMatch ? 'text-green-600' : 'text-red-500'}>
                        {passwordsMatch ? '✓ Passwords match' : '• Passwords do not match'}
                      </p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Sending OTP...
                    </span>
                  ) : 'Send OTP →'}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Enter OTP</label>
                  <input
                    name="otp" type="text" maxLength="6" required
                    value={formData.otp} onChange={handleChange}
                    placeholder="000000"
                    className="input-field text-center text-xl sm:text-2xl tracking-[0.24em] sm:tracking-[0.5em] font-bold"
                    autoFocus
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Verifying...
                    </span>
                  ) : 'Verify & Register →'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={handleResendOTP}
                    disabled={loading || resendCountdown > 0}
                    className="font-semibold disabled:opacity-40" style={{ color: BRAND }}>
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
                  </button>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-gray-400 hover:text-gray-600">
                    ← Change Details
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default Register;
