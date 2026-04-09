import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { sendPhoneOTP, verifyPhoneOTP, getReadableFirebaseAuthError } from '../firebase';
import { validatePassword, validatePhone } from '../utils/validators';
import { BRAND } from '../constants/theme';
import logo from '../assets/logo.png';

const OTP_BLOCK_SECONDS = 300;
const OTP_BLOCK_KEY = 'fb_otp_block_until';

const getSecondsUntil = (untilTs) => {
  const diff = Math.ceil((untilTs - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
};

const isTooManyRequestsError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('too-many-requests') || message.includes('auth/too-many-requests');
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const nativePlatform = Boolean(window?.Capacitor?.isNativePlatform?.());
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: new password
  const [loading, setLoading] = useState(false);
  const [otpBlockRemaining, setOtpBlockRemaining] = useState(0);
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [firebaseToken, setFirebaseToken] = useState(null);

  React.useEffect(() => {
    const stored = Number(localStorage.getItem(OTP_BLOCK_KEY) || 0);
    if (!stored) return;
    const remaining = getSecondsUntil(stored);
    if (remaining > 0) {
      setOtpBlockRemaining(remaining);
    } else {
      localStorage.removeItem(OTP_BLOCK_KEY);
    }
  }, []);

  React.useEffect(() => {
    if (otpBlockRemaining <= 0) return;
    const t = setInterval(() => {
      setOtpBlockRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(OTP_BLOCK_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [otpBlockRemaining]);

  const startOtpBlock = (seconds = OTP_BLOCK_SECONDS) => {
    const until = Date.now() + seconds * 1000;
    localStorage.setItem(OTP_BLOCK_KEY, String(until));
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

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (otpBlockRemaining > 0) {
      toast.error(`Please wait ${otpBlockRemaining}s before trying OTP again.`);
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP sent to your phone number');
      setStep(2);
    } catch (error) {
      console.error('Send OTP error:', error);
      if (isTooManyRequestsError(error)) {
        startOtpBlock();
      }
      toast.error(getReadableFirebaseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!nativePlatform && (!formData.otp || formData.otp.length !== 6)) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const token = await verifyPhoneOTP(formData.otp);
      setFirebaseToken(token);
      toast.success('Phone verified successfully');
      setStep(3);
    } catch (error) {
      toast.error(getReadableFirebaseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validatePassword(formData.newPassword)) {
      toast.error('Password must be at least 6 characters, with one uppercase, one lowercase, and one special character');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/auth/reset-password', {
        phone: formData.phone,
        firebaseToken,
        newPassword: formData.newPassword
      });

      toast.success(response.data.message || 'Password reset successful');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpBlockRemaining > 0) return;
    setLoading(true);
    try {
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP resent to your phone');
    } catch (error) {
      if (isTooManyRequestsError(error)) {
        startOtpBlock();
      }
      toast.error(getReadableFirebaseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-shell min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#F6F1F1' }}>
      <div className="auth-form-shell max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center mb-1">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#FBF7F6] border border-[#EFE3E3]">
            <div className="w-8 h-8 rounded-md bg-white border border-[#EEE4E4] flex items-center justify-center">
              <img src={logo} alt="FlashBites" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-base font-black text-[#201A1C]">FlashBites</span>
          </div>
        </div>

        <div className="auth-surface p-5 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#201A1C] mb-2">Forgot Password</h2>
            <p className="text-sm text-[#6B6064]">
              {step === 1 && 'Enter your phone number to receive OTP'}
              {step === 2 && 'Enter the OTP sent to your phone'}
              {step === 3 && 'Create your new password'}
            </p>
          </div>

          <div className="flex justify-center items-center space-x-4 my-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'text-white' : 'bg-[#E7DCDC] text-[#8E8387]'}`} style={step >= 1 ? { background: BRAND } : {}}>
              1
            </div>
            <div className="w-12 h-1 rounded-full" style={{ background: step >= 2 ? BRAND : '#E7DCDC' }} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'text-white' : 'bg-[#E7DCDC] text-[#8E8387]'}`} style={step >= 2 ? { background: BRAND } : {}}>
              2
            </div>
            <div className="w-12 h-1 rounded-full" style={{ background: step >= 3 ? BRAND : '#E7DCDC' }} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'text-white' : 'bg-[#E7DCDC] text-[#8E8387]'}`} style={step >= 3 ? { background: BRAND } : {}}>
              3
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="mt-8 space-y-6">
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Phone Number</label>
                <div className="auth-input-base flex overflow-hidden">
                  <span className="inline-flex items-center px-4 text-[#2B2426] text-sm font-semibold">+91</span>
                  <span className="inline-flex items-center px-2 text-[#7B6E72]">⌄</span>
                  <span className="my-3 w-px bg-[#DCCFCF]" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength="10"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="flex-1 bg-transparent px-4 text-[14px] sm:text-[15px] text-[#3A3235] placeholder:text-[#AA9EA2] outline-none"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpBlockRemaining > 0}
                className="w-full h-[54px] sm:h-[58px] rounded-[1.25rem] sm:rounded-[2rem] text-white text-base font-extrabold transition-all disabled:opacity-70"
                style={{ background: BRAND, boxShadow: '0 12px 28px rgba(234,88,12,0.24)' }}
              >
                {loading ? 'Sending...' : otpBlockRemaining > 0 ? `Try again in ${otpBlockRemaining}s` : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="mt-8 space-y-6">
              <div>
                <label htmlFor="otp" className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Enter OTP</label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength="6"
                  required
                  value={formData.otp}
                  onChange={handleChange}
                  className="auth-input-base text-center text-lg sm:text-xl tracking-[0.22em] sm:tracking-[0.24em] font-bold text-[#3A3235] placeholder:text-[#AA9EA2] outline-none"
                  placeholder="000000"
                  autoFocus
                />
                <p className="mt-2 text-xs text-[#8E8387] text-center">OTP sent to +91 {formData.phone}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] sm:h-[58px] rounded-[1.25rem] sm:rounded-[2rem] text-white text-base font-extrabold transition-all disabled:opacity-70"
                style={{ background: BRAND, boxShadow: '0 12px 28px rgba(234,88,12,0.24)' }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                <button type="button" onClick={handleResendOTP} disabled={loading} className="text-sm font-semibold" style={{ color: BRAND }}>
                  {otpBlockRemaining > 0 ? `Retry in ${otpBlockRemaining}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">New Password</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="auth-input-base px-4 text-[14px] sm:text-[15px] text-[#3A3235] placeholder:text-[#AA9EA2] outline-none"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#7B6E72] uppercase tracking-[0.12em] mb-1.5">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="auth-input-base px-4 text-[14px] sm:text-[15px] text-[#3A3235] placeholder:text-[#AA9EA2] outline-none"
                  placeholder="Re-enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] sm:h-[58px] rounded-[1.25rem] sm:rounded-[2rem] text-white text-base font-extrabold transition-all disabled:opacity-70"
                style={{ background: BRAND, boxShadow: '0 12px 28px rgba(234,88,12,0.24)' }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-[#8E8387] hover:text-[#5B5256] transition-colors">← Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
