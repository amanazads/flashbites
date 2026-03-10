import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { setupRecaptcha, sendPhoneOTP, verifyPhoneOTP } from '../firebase';

const BRAND = '#f97316';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: new password
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [firebaseToken, setFirebaseToken] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!formData.phone || formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP sent to your phone number');
      setStep(2);
    } catch (error) {
      console.error('Send OTP error:', error);
      if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else if (error.code === 'auth/invalid-phone-number') {
        toast.error('Invalid phone number format');
      } else {
        toast.error(error.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!formData.otp || formData.otp.length !== 6) {
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
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!formData.newPassword || formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
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
    setLoading(true);
    try {
      setupRecaptcha();
      const phoneWithCode = `+91${formData.phone}`;
      await sendPhoneOTP(phoneWithCode);
      toast.success('OTP resent to your phone');
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-white">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send OTP'}
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
                  className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                  placeholder="000000"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-400 text-center">
                  OTP sent to +91 {formData.phone}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                <button type="button" onClick={handleResendOTP} disabled={loading}
                  className="text-sm font-semibold" style={{ color: BRAND }}>
                  Resend OTP
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
                  placeholder="Min 6 characters"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default ForgotPassword;
