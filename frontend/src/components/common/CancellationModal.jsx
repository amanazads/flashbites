import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CANCELLATION_POLICY } from '../../utils/cancellationPolicy';
import { formatCurrency } from '../../utils/formatters';

const CancellationModal = ({ isOpen, onClose, onConfirm, order, loading }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  if (!isOpen || !order) return null;

  const cancellationCheck = CANCELLATION_POLICY.canCancelOrder(order);
  const cancellationFee = CANCELLATION_POLICY.calculateCancellationFee(order);
  const refundAmount = order.total - cancellationFee;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedReason) {
      alert('Please select a reason for cancellation');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      alert('Please specify your reason');
      return;
    }

    if (!agreedToPolicy && !cancellationCheck.canCancel) {
      alert('Please acknowledge the cancellation policy');
      return;
    }

    const reason = selectedReason === 'other' 
      ? otherReason 
      : CANCELLATION_POLICY.CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label;

    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Cancel Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Order Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Order #{order._id?.slice(-8)}</p>
            <p className="font-semibold text-lg">{order.restaurantId?.name}</p>
            <p className="text-primary-600 font-bold">{formatCurrency(order.total)}</p>
          </div>

          {/* Cancellation Status */}
          {!cancellationCheck.canCancel ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">
                    Cancellation Not Allowed
                  </h3>
                  <p className="text-sm text-red-800">
                    {cancellationCheck.reason}
                  </p>
                  {cancellationFee > 0 && (
                    <p className="text-sm text-red-800 mt-2">
                      If you still want to cancel, please contact restaurant support.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Cancellation Fee Info */}
              {cancellationFee > 0 ? (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-2">
                        Cancellation Charges Apply
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Order Total:</span>
                          <span className="font-medium">{formatCurrency(order.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Cancellation Fee:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(cancellationFee)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-yellow-300">
                          <span className="font-semibold text-gray-900">Refund Amount:</span>
                          <span className="font-bold text-green-600">{formatCurrency(refundAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ {cancellationCheck.reason}
                  </p>
                  <p className="text-sm text-green-800 mt-1 font-semibold">
                    Full refund: {formatCurrency(order.total)}
                  </p>
                </div>
              )}

              {/* Reason Selection */}
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Why are you cancelling? *
                  </label>
                  <div className="space-y-2">
                    {CANCELLATION_POLICY.CANCELLATION_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 text-sm text-gray-900">{reason.label}</span>
                      </label>
                    ))}
                  </div>

                  {selectedReason === 'other' && (
                    <textarea
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Please specify your reason..."
                      className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={3}
                      required
                    />
                  )}
                </div>

                {/* Policy Agreement */}
                {cancellationFee > 0 && (
                  <div className="mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToPolicy}
                        onChange={(e) => setAgreedToPolicy(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                        required
                      />
                      <span className="text-sm text-gray-700">
                        I understand that a cancellation fee of {formatCurrency(cancellationFee)} will be deducted 
                        from my refund amount as per the cancellation policy.
                      </span>
                    </label>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    disabled={loading}
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !selectedReason}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Cancellation Policy Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-sm text-blue-900 mb-2">
              📋 Cancellation Policy
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Free cancellation for pending orders</li>
              <li>• Free cancellation within 60 seconds of restaurant confirmation</li>
              <li>• Orders being prepared cannot be cancelled</li>
              <li>• Refunds will be processed within 5-7 business days</li>
              <li>• For assistance, contact restaurant or support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;
