import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { submitAccountDeletionRequest, getMyDeletionRequest } from '../api/userApi';
import { BRAND } from '../constants/theme';

const AccountDeletePage = () => {
  const { user } = useSelector((state) => state.auth);

  const [deletionReason, setDeletionReason] = useState('');
  const [deletionDetails, setDeletionDetails] = useState('');
  const [submittingDeletionRequest, setSubmittingDeletionRequest] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);

  useEffect(() => {
    if (user?.role === 'user') {
      fetchMyDeletionRequest();
    }
  }, [user]);

  const fetchMyDeletionRequest = async () => {
    try {
      const res = await getMyDeletionRequest();
      setDeletionRequest(res?.data?.request || null);
      setFeatureUnavailable(false);
    } catch (error) {
      if (error?.response?.status === 404) {
        setFeatureUnavailable(true);
        return;
      }
      setDeletionRequest(null);
    }
  };

  const handleSubmitDeletionRequest = async (e) => {
    e.preventDefault();

    if (deletionReason.trim().length < 10) {
      toast.error('Please provide a reason with at least 10 characters');
      return;
    }

    setSubmittingDeletionRequest(true);
    try {
      const payload = {
        reason: deletionReason.trim(),
        details: deletionDetails.trim(),
      };

      const res = await submitAccountDeletionRequest(payload);
      setDeletionRequest(res?.data?.request || null);
      setFeatureUnavailable(false);
      setDeletionReason('');
      setDeletionDetails('');
      toast.success('Deletion request submitted for admin review');
    } catch (error) {
      if (error?.response?.status === 404) {
        setFeatureUnavailable(true);
        toast.error('Account deletion request service is not available yet. Please try again later.');
        return;
      }
      toast.error(error?.response?.data?.message || 'Failed to submit deletion request');
    } finally {
      setSubmittingDeletionRequest(false);
    }
  };

  if (user?.role !== 'user') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold mb-4"
            style={{ color: BRAND }}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Profile
          </Link>
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <p className="text-sm text-gray-600">This page is only available for customer accounts.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm font-semibold mb-4"
          style={{ color: BRAND }}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Profile
        </Link>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Account Deletion Request</p>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-xl p-3" style={{ background: '#FFF7ED' }}>
              <p className="text-[13px] font-semibold" style={{ color: '#9A3412' }}>
                Your request will be reviewed by admins and deletion is usually completed in 2-4 weeks.
              </p>
              <ul className="mt-2 text-[12px] text-orange-700 list-disc pl-4 space-y-1">
                <li>Direct self-delete is disabled for safety and compliance.</li>
                <li>We may retain limited records required by law or fraud prevention.</li>
                <li>You can continue using your account while the request is under review.</li>
              </ul>
            </div>

            {featureUnavailable && (
              <div className="rounded-xl p-3 bg-red-50 border border-red-200">
                <p className="text-[13px] font-semibold text-red-700">Service Unavailable</p>
                <p className="text-[12px] text-red-700 mt-1">
                  Account deletion requests are not available on the server right now. Please try again after backend deployment.
                </p>
              </div>
            )}

            {deletionRequest?.status === 'pending' && (
              <div className="rounded-xl p-3 bg-yellow-50 border border-yellow-200">
                <p className="text-[13px] font-semibold text-yellow-800">Request Status: Pending Review</p>
                <p className="text-[12px] text-yellow-700 mt-1">
                  Submitted on {new Date(deletionRequest.createdAt).toLocaleDateString()}. Admin team will review and update status.
                </p>
              </div>
            )}

            {deletionRequest?.status === 'rejected' && (
              <div className="rounded-xl p-3 bg-red-50 border border-red-200">
                <p className="text-[13px] font-semibold text-red-700">Last Request: Rejected</p>
                {deletionRequest.adminNotes && (
                  <p className="text-[12px] text-red-700 mt-1">Admin note: {deletionRequest.adminNotes}</p>
                )}
              </div>
            )}

            {deletionRequest?.status === 'approved' && (
              <div className="rounded-xl p-3 bg-green-50 border border-green-200">
                <p className="text-[13px] font-semibold text-green-700">Last Request: Approved</p>
                <p className="text-[12px] text-green-700 mt-1">Your account was approved for deletion by admin.</p>
              </div>
            )}

            {deletionRequest?.status !== 'pending' && !featureUnavailable && (
              <form onSubmit={handleSubmitDeletionRequest} className="space-y-3">
                <textarea
                  rows={3}
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Reason for account deletion (minimum 10 characters)"
                  className="input-field"
                  required
                />
                <textarea
                  rows={3}
                  value={deletionDetails}
                  onChange={(e) => setDeletionDetails(e.target.value)}
                  placeholder="Additional details (optional)"
                  className="input-field"
                />
                <button
                  type="submit"
                  disabled={submittingDeletionRequest}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14.5px] font-bold transition-colors disabled:opacity-60"
                  style={{ background: '#FFE4E6', color: '#DC2626' }}
                >
                  <TrashIcon className="w-5 h-5" />
                  {submittingDeletionRequest ? 'Submitting Request...' : 'Submit Deletion Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletePage;