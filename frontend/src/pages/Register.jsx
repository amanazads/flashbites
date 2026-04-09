import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, setAuthUser } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validateEmail, validatePhone, validatePassword } from '../utils/validators';
import axios from '../api/axios';
import { sendPhoneOTP, verifyPhoneOTP, getReadableFirebaseAuthError } from '../firebase';
import logo from '../assets/logo.png';
import { BRAND } from '../constants/theme';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&q=80';

const OTP_BLOCK_SECONDS = 300;
const OTP_BLOCK_KEY_PREFIX = 'fb_otp_block_until:';

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const getOtpBlockKey = (phone) => {
  const normalized = normalizePhone(phone);
  return normalized ? `${OTP_BLOCK_KEY_PREFIX}${normalized}` : '';
};

const getSecondsUntil = (untilTs) => {
  const diff = Math.ceil((untilTs - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
};

const storageSet = async (key, value) => {
  if (window.Capacitor) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: String(value) });
      return;
    } catch {
      // Fall back to localStorage.
    }
  }
  localStorage.setItem(key, String(value));
};

const storageGet = async (key) => {
  if (window.Capacitor) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      // Fall back to localStorage.
    }
  }
  return localStorage.getItem(key);
};

const storageRemove = async (key) => {
  if (window.Capacitor) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
      return;
    } catch {
      // Fall back to localStorage.
    }
  }
  localStorage.removeItem(key);
};

const isTooManyRequestsError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('too-many-requests') || message.includes('auth/too-many-requests');
};

const getRemainingOtpBlockSeconds = async (phone) => {
  const key = getOtpBlockKey(phone);
  if (!key) return 0;

  const stored = Number((await storageGet(key)) || 0);
  if (!stored) return 0;

  const remaining = getSecondsUntil(stored);
  if (remaining <= 0) {
    await storageRemove(key);
    return 0;
  }

  return remaining;
};

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, isAuthenticated, user } = useSelector((state) => state.auth);
  const nativePlatform = Boolean(window?.Capacitor?.isNativePlatform?.());

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpBlockRemaining, setOtpBlockRemaining] = useState(0);
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

  /* Resend countdown timer */
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  useEffect(() => {
    let cancelled = false;
    getRemainingOtpBlockSeconds(formData.phone).then((remaining) => {
      if (!cancelled) {
        setOtpBlockRemaining(remaining);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [formData.phone]);

  useEffect(() => {
    if (otpBlockRemaining <= 0) return;
    const key = getOtpBlockKey(formData.phone);

    const t = setInterval(() => {
      setOtpBlockRemaining((prev) => {
        if (prev <= 1) {
          if (key) {
            void storageRemove(key);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [otpBlockRemaining, formData.phone]);

  const startOtpBlock = async (seconds = OTP_BLOCK_SECONDS, phone = formData.phone) => {
    const key = getOtpBlockKey(phone);
    if (!key) return;

    const until = Date.now() + seconds * 1000;
    await storageSet(key, String(until));
    setOtpBlockRemaining(seconds);
  };

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

    if (otpBlockRemaining > 0) {
      toast.error(`Please wait ${otpBlockRemaining}s before requesting OTP again.`);
      return;
    }

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
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP sent to your phone number');
      setStep(2);
      setResendCountdown(30); // 30s before resend allowed
    } catch (error) {
      if (isTooManyRequestsError(error)) {
        await startOtpBlock();
        toast.error('OTP is temporarily rate-limited for this number/device. Please wait a few minutes and try again.');
        return;
      }
      toast.error(getReadableFirebaseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!nativePlatform && (!formData.otp || formData.otp.length !== 6)) {
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
    if (resendCountdown > 0 || otpBlockRemaining > 0) return;
    setLoading(true);
    try {
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP resent to your phone');
      setResendCountdown(30);
    } catch (error) {
      if (isTooManyRequestsError(error)) {
        await startOtpBlock();
        toast.error('OTP is temporarily rate-limited for this number/device. Please wait a few minutes and try again.');
        return;
      }
      toast.error(getReadableFirebaseAuthError(error));
    } finally {
      setLoading(false);
    }
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

          <p className="text-[#4B4346] text-lg mb-6">Create your account and start ordering in minutes.</p>

          <div className="rounded-[2rem] overflow-hidden shadow-[0_18px_42px_rgba(38,24,27,0.15)] mb-8">
            <img src={HERO_IMAGE} alt="Curated meal" className="w-full h-[280px] object-cover" />
          </div>

          <div className="text-left inline-flex flex-col gap-3">
            {[
              { icon: '📱', t: 'Quick phone verification' },
              { icon: '🍽️', t: 'Curated restaurants' },
              { icon: '🚀', t: 'Fast checkout experience' },
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
            <h2 className="text-[1.7rem] sm:text-[2rem] font-black text-[#201A1C] leading-tight mb-1">
              {step === 1 ? 'Create account' : 'Verify phone'}
            </h2>
            <p className="text-sm text-[#6B6064] mb-6">
              {step === 1 ? (
                <>Already have an account? <Link to="/login" className="font-semibold" style={{ color: BRAND }}>Sign in</Link></>
              ) : (
                <>Enter the 6-digit OTP sent to <span className="font-semibold text-[#4A4043]">+91 {formData.phone}</span></>
              )}
            </p>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: BRAND }} />
              <div className="flex-1 h-1.5 rounded-full" style={{ background: step >= 2 ? BRAND : '#E7DCDC' }} />
            </div>

            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="auth-input-base px-4 text-[14px] sm:text-[15px] placeholder:text-[#AA9EA2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Phone Number</label>
                  <div className="auth-input-base flex overflow-hidden">
                    <span className="inline-flex items-center px-4 text-[#2B2426] text-sm font-semibold">+91</span>
                    <span className="inline-flex items-center px-2 text-[#7B6E72]">⌄</span>
                    <span className="my-3 w-px bg-[#DCCFCF]" />
                    <input
                      name="phone"
                      type="tel"
                      required
                      maxLength="10"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      className="flex-1 bg-transparent px-4 text-[14px] sm:text-[15px] text-[#3A3235] placeholder:text-[#AA9EA2] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Email <span className="text-[#B4A7AC]">(optional)</span></label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="auth-input-base px-4 text-[14px] sm:text-[15px] placeholder:text-[#AA9EA2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setShowPasswordGuide(true)}
                      placeholder="Min 6 characters"
                      className="auth-input-base px-4 pr-16 text-[14px] sm:text-[15px] placeholder:text-[#AA9EA2] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.06em] text-[#8A7E82]"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onFocus={() => setShowPasswordGuide(true)}
                      placeholder="Re-enter password"
                      className="auth-input-base px-4 pr-16 text-[14px] sm:text-[15px] placeholder:text-[#AA9EA2] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.06em] text-[#8A7E82]"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {showPasswordGuide && (
                  <div className="rounded-2xl border border-[#E7DCDC] bg-[#F6EEEC] p-3 text-xs space-y-1">
                    <p className="font-semibold text-[#52484B]">Password requirements</p>
                    <p className={passwordRules.minLength ? 'text-green-600' : 'text-[#786E72]'}>
                      {passwordRules.minLength ? '✓' : '•'} At least 6 characters
                    </p>
                    <p className={passwordRules.uppercase ? 'text-green-600' : 'text-[#786E72]'}>
                      {passwordRules.uppercase ? '✓' : '•'} One uppercase letter
                    </p>
                    <p className={passwordRules.lowercase ? 'text-green-600' : 'text-[#786E72]'}>
                      {passwordRules.lowercase ? '✓' : '•'} One lowercase letter
                    </p>
                    <p className={passwordRules.special ? 'text-green-600' : 'text-[#786E72]'}>
                      {passwordRules.special ? '✓' : '•'} One special character
                    </p>
                    {formData.confirmPassword && (
                      <p className={passwordsMatch ? 'text-green-600' : 'text-red-500'}>
                        {passwordsMatch ? '✓ Passwords match' : '• Passwords do not match'}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpBlockRemaining > 0}
                  className="w-full h-[54px] sm:h-[60px] rounded-[1.25rem] sm:rounded-[2rem] text-white text-base sm:text-lg font-extrabold transition-all disabled:opacity-70"
                  style={{ background: BRAND, boxShadow: '0 12px 28px rgba(234,88,12,0.24)' }}
                >
                  {loading ? 'Sending OTP...' : otpBlockRemaining > 0 ? `Try again in ${otpBlockRemaining}s` : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Enter OTP</label>
                  <input
                    name="otp"
                    type="text"
                    maxLength="6"
                    required
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="000000"
                    className="auth-input-base text-center text-lg sm:text-xl tracking-[0.22em] sm:tracking-[0.24em] font-bold placeholder:text-[#AA9EA2] outline-none"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[54px] sm:h-[60px] rounded-[1.25rem] sm:rounded-[2rem] text-white text-base sm:text-lg font-extrabold transition-all disabled:opacity-70"
                  style={{ background: BRAND, boxShadow: '0 12px 28px rgba(234,88,12,0.24)' }}
                >
                  {loading ? 'Verifying...' : 'Verify & Register'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading || resendCountdown > 0 || otpBlockRemaining > 0}
                    className="font-semibold disabled:opacity-40"
                    style={{ color: BRAND }}
                  >
                    {otpBlockRemaining > 0 ? `Try again in ${otpBlockRemaining}s` : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
                  </button>
                  <button type="button" onClick={() => setStep(1)} className="text-[#8E8387] hover:text-[#5B5256]">
                    ← Change Details
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
