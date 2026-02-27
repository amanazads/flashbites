import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Preferences } from '@capacitor/preferences';
import {
  FiArrowLeft,
  FiEdit2,
  FiChevronRight,
  FiUser,
  FiBell,
  FiGlobe,
  FiShield,
  FiFileText,
  FiAlertTriangle,
} from 'react-icons/fi';
import { getCurrentUser, logout } from '../redux/slices/authSlice';
import { updateProfile } from '../api/userApi';
import { logout as logoutApi } from '../api/authApi';
import toast from 'react-hot-toast';

const Settings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const initials = (user?.name || 'U').slice(0, 1).toUpperCase();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out');
    navigate('/');
  };

  const openEditModal = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });
      await dispatch(getCurrentUser());
      setShowEditModal(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      try {
        await logoutApi();
      } catch {
        // Continue even if server logout fails, local cleanup is still required.
      }

      await Preferences.remove({ key: 'token' });
      await Preferences.remove({ key: 'accessToken' });
      await Preferences.remove({ key: 'refreshToken' });

      dispatch(logout());
      localStorage.clear();
      sessionStorage.clear();

      setShowDeleteModal(false);
      toast.success('Account removed from this device');
      navigate('/login', { replace: true });
    } finally {
      setDeleting(false);
    }
  };

  const Row = ({ icon, title, subtitle, danger = false, onClick, expanded = false }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 ${danger ? 'bg-red-50' : 'bg-[#eceff3]'} active:opacity-80 transition-opacity`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${danger ? 'bg-red-100 text-red-500' : 'bg-[#f3ece8] text-orange-500'} shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 text-left">
          <p className={`text-[16px] font-semibold ${danger ? 'text-red-600' : 'text-slate-900'} truncate`}>{title}</p>
          {subtitle && (
            <p className={`text-[14px] ${danger ? 'text-red-400' : 'text-slate-500'} truncate`}>{subtitle}</p>
          )}
        </div>
      </div>
      <FiChevronRight className={`${danger ? 'text-red-400' : 'text-slate-400'} w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
    </button>
  );

  return (
    <div className="bg-[#f3f4f6] min-h-screen">
      <div className="max-w-md mx-auto px-5 pt-5 pb-32">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-normal text-slate-900">Settings</h1>
          <div className="w-9 h-9" />
        </div>

        <div className="mt-7 flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#f6d9cf] flex items-center justify-center">
              <div className="w-[88px] h-[88px] rounded-full border-[3px] border-white bg-[#e7d1ae] flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-700">{initials}</span>
              </div>
            </div>
            <button
              onClick={openEditModal}
              className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-2 rounded-full shadow-md"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <h2 className="mt-3 text-[28px] leading-tight font-semibold text-slate-900 text-center">{user?.name || 'User Name'}</h2>
          <p className="mt-1 text-slate-500 text-[15px] text-center">{user?.email || 'user@example.com'}</p>

          <button
            onClick={openEditModal}
            className="mt-4 h-11 px-8 rounded-full bg-[#f3ece8] text-orange-500 text-[16px] font-semibold"
          >
            Edit Profile
          </button>
        </div>

        <section className="mt-7">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Account</h3>
          <div className="rounded-3xl overflow-hidden">
            <Row
              icon={<FiUser className="w-5 h-5" />}
              title="Account Information"
              subtitle="Name, Email, Phone Number"
              expanded={showAccountInfo}
              onClick={() => setShowAccountInfo((prev) => !prev)}
            />
            {showAccountInfo && (
              <div className="px-4 py-3 bg-white border-y border-slate-200">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Name</span>
                    <span className="text-[14px] font-semibold text-slate-900 text-right">{user?.name || 'N/A'}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Email</span>
                    <span className="text-[14px] font-semibold text-slate-900 text-right break-all">{user?.email || 'N/A'}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Phone</span>
                    <span className="text-[14px] font-semibold text-slate-900 text-right">{user?.phone || 'Not added'}</span>
                  </div>
                </div>
              </div>
            )}
            <Row icon={<FiBell className="w-5 h-5" />} title="Notifications" subtitle="Push, Email & SMS preferences" onClick={() => navigate('/notifications')} />
            <Row icon={<FiGlobe className="w-5 h-5" />} title="Language" subtitle="English (US)" onClick={() => toast('Language options coming soon')} />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Legal & Info</h3>
          <div className="rounded-3xl overflow-hidden">
            <Row icon={<FiShield className="w-5 h-5" />} title="Privacy Policy" onClick={() => navigate('/privacy')} />
            <Row icon={<FiFileText className="w-5 h-5" />} title="Terms of Service" onClick={() => navigate('/terms')} />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Danger Zone</h3>
          <div className="rounded-3xl overflow-hidden">
            <Row
              icon={<FiAlertTriangle className="w-5 h-5" />}
              title="Delete Account"
              subtitle="This action cannot be undone"
              danger
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
            />
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="mt-8 w-full text-center text-[22px] font-medium text-slate-500 py-3"
        >
          Log Out
        </button>

        <p className="mt-2 text-center text-[10px] text-slate-300">FLASHBITES V4.2.0</p>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-3xl p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Edit Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-[12px] text-slate-500 block mb-1">Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="text-[12px] text-slate-500 block mb-1">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="text-[12px] text-slate-500 block mb-1">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-3xl p-4">
            <h2 className="text-[18px] font-semibold text-slate-900">Delete Account</h2>
            <p className="mt-2 text-[13px] text-slate-600">
              This will clear your account session and all saved app data on this device.
            </p>
            <p className="mt-2 text-[12px] text-slate-500">Type <span className="font-semibold">DELETE</span> to continue.</p>

            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-3 w-full h-11 px-3 rounded-xl border border-slate-200"
              placeholder="Type DELETE"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
