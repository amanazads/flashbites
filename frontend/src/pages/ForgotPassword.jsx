import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/auth/send-otp', {
        email: formData.email,
        purpose: 'forgot-password'
      });

      toast.success(response.data.message || 'OTP sent to your email');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
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
      await axios.post('/auth/verify-otp', {
        email: formData.email,
        otp: formData.otp
      });

      toast.success('OTP verified successfully');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
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
        email: formData.email,
        otp: formData.otp,
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
      await axios.post('/auth/send-otp', {
        email: formData.email,
        purpose: 'forgot-password'
      });
      toast.success('OTP resent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Forgot Password
            </h2>
            <p className="text-sm text-gray-600">
              {step === 1 && "Enter your email to receive OTP"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Create your new password"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center items-center space-x-4 my-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <div className={`w-12 h-1 ${step >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
          </div>

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="mt-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength="6"
                  required
                  value={formData.otp}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="000000"
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  OTP sent to {formData.email}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-orange-500 hover:text-orange-600 disabled:opacity-50"
                >
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
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-orange-500 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
