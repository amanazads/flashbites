import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { requestViaFetch, requestViaNativeHttp, shouldFallbackToNativeHttp } from '../api/nativeHttpFallback';
import { sendPhoneOTP, verifyPhoneOTP, getReadableFirebaseAuthError } from '../firebase';
import { validatePassword, validatePhone } from '../utils/validators';
import { BRAND } from '../constants/theme';

const isNativePlatform = () => !!(
  typeof window !== 'undefined'
  && (() => {
    const cap = window.Capacitor;
    if (!cap) return false;
    if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
    if (typeof cap.getPlatform === 'function') return cap.getPlatform() !== 'web';
    return window.location.protocol === 'https:' && window.location.hostname === 'localhost';
  })()
);

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

const isBackendNetworkError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return !error?.response && (
    code.includes('err_network')
    || code.includes('econnaborted')
    || message.includes('network error')
    || message.includes('timeout')
  );
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const nativePlatform = isNativePlatform();
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
      try {
        const precheck = await axios.get('/auth/phone-status', {
          params: {
            phone: formData.phone,
            purpose: 'reset'
          }
        });

        const canSendOtp = Boolean(precheck?.data?.data?.canSendOtp);
        if (!canSendOtp) {
          toast.error(precheck?.data?.message || 'No account found with this phone number');
          return;
        }
      } catch (precheckError) {
        // Keep flow compatible with backend snapshots where /auth/phone-status may not exist.
        // Continue with OTP send and let reset API validate account existence.
      }

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
      toast.error('Password must be at least 8 characters, with one uppercase, one lowercase, and one special character');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const resetPayload = {
        phone: formData.phone,
        firebaseToken,
        newPassword: formData.newPassword
      };

      let response;
      try {
        response = await axios.post('/auth/reset-password', resetPayload);
      } catch (resetError) {
        if (!shouldFallbackToNativeHttp(resetError)) {
          throw resetError;
        }

        try {
          const data = await requestViaFetch({
            method: 'POST',
            path: '/auth/reset-password',
            data: resetPayload,
          });
          response = { data };
        } catch {
          const data = await requestViaNativeHttp({
            method: 'POST',
            path: '/auth/reset-password',
            data: resetPayload,
          });
          response = { data };
        }
      }

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
      try {
        const precheck = await axios.get('/auth/phone-status', {
          params: {
            phone: formData.phone,
            purpose: 'reset'
          }
        });

        const canSendOtp = Boolean(precheck?.data?.data?.canSendOtp);
        if (!canSendOtp) {
          toast.error(precheck?.data?.message || 'No account found with this phone number');
          return;
        }
      } catch (precheckError) {
        // Keep flow compatible with backend snapshots where /auth/phone-status may not exist.
        // Continue with OTP resend and rely on server validation in reset endpoint.
      }

      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode, { force: true });
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
    <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: '#F8F6F5' }}>
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.07)' }}>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Forgot Password
            </h2>
            <p className="text-sm text-gray-400">
              {step === 1 && "Enter your phone number to receive OTP"}
              {step === 2 && "Enter the OTP sent to your phone"}
              {step === 3 && "Create your new password"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center items-center space-x-4 my-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'text-white' : 'bg-gray-200 text-gray-500'}`}
              style={step >= 1 ? { background: BRAND } : {}}>
              1
            </div>
            <div className="w-12 h-1 rounded-full" style={{ background: step >= 2 ? BRAND : '#E5E7EB' }} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'text-white' : 'bg-gray-200 text-gray-500'}`}
              style={step >= 2 ? { background: BRAND } : {}}>
              2
            </div>
            <div className="w-12 h-1 rounded-full" style={{ background: step >= 3 ? BRAND : '#E5E7EB' }} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'text-white' : 'bg-gray-200 text-gray-500'}`}
              style={step >= 3 ? { background: BRAND } : {}}>
              3
            </div>
          </div>

          {/* Step 1: Phone */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="mt-8 space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                    +91
                  </span>
                  <input
                    id="phone" name="phone" type="tel" maxLength="10" required
                    value={formData.phone} onChange={handleChange}
                    className="input-field rounded-l-none flex-1"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading || otpBlockRemaining > 0}
                className="btn-primary w-full py-3">
                {loading ? 'Sending...' : otpBlockRemaining > 0 ? `Try again in ${otpBlockRemaining}s` : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="mt-8 space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  id="otp" name="otp" type="text" maxLength="6" required
                  value={formData.otp} onChange={handleChange}
                  className="input-field text-center text-xl sm:text-2xl tracking-[0.24em] sm:tracking-[0.5em] font-bold"
                  placeholder="000000"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-400 text-center">
                  OTP sent to +91 {formData.phone}
                </p>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                <button type="button" onClick={handleResendOTP} disabled={loading}
                  className="text-sm font-semibold" style={{ color: BRAND }}>
                  {otpBlockRemaining > 0 ? `Retry in ${otpBlockRemaining}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword" name="newPassword" type="password" required
                  value={formData.newPassword} onChange={handleChange}
                  className="input-field"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password" required
                  value={formData.confirmPassword} onChange={handleChange}
                  className="input-field"
                  placeholder="Re-enter password"
                />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
