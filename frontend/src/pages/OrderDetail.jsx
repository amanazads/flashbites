import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getOrderById, cancelOrder } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/constants';
import { Loader } from '../components/common/Loader';
import ReviewModal from '../components/common/ReviewModal';
import CancellationModal from '../components/common/CancellationModal';
import LiveTracking from '../components/tracking/LiveTracking';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  CreditCardIcon,
  ReceiptRefundIcon,
  BuildingStorefrontIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(API_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for order tracking');
      // Join order room for real-time updates
      newSocket.emit('join_order_room', id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_order_room', id);
      newSocket.close();
    };
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
    // Auto-refresh every 30 seconds for status updates
    const interval = setInterval(fetchOrderDetails, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const response = await getOrderById(id);
      setOrder(response.data.order);
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (reason) => {
    setCancelling(true);
    try {
      await cancelOrder(id, { reason });
      toast.success('Order cancelled successfully');
      setShowCancellationModal(false);
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const getOrderStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: CheckCircleIcon },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
      { key: 'preparing', label: 'Preparing', icon: ClockIcon },
      { key: 'ready', label: 'Ready', icon: CheckCircleIcon },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: TruckIcon },
      { key: 'delivered', label: 'Delivered', icon: CheckCircleIcon }
    ];

    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex
    }));
  };

  if (loading) return <Loader />;
  if (!order) return null;

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/orders')}
            className="text-primary-600 hover:text-primary-700 mb-4"
          >
            ← Back to Orders
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Order Details</h1>
              <p className="text-gray-600">Order #{order._id.slice(-8).toUpperCase()}</p>
              <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
            </div>
            <span className={`badge text-sm sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2 ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>

        {/* Order Status Timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-bold mb-6">Order Status</h2>
            <div className="relative overflow-x-auto">
              <div className="flex justify-between items-center min-w-[640px]">
                {getOrderStatusSteps().map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex-1 relative">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 text-white'
                              : step.current
                              ? 'bg-primary-500 text-white animate-pulse'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <p
                          className={`mt-2 text-xs text-center font-medium ${
                            step.completed || step.current ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                      {index < getOrderStatusSteps().length - 1 && (
                        <div
                          className={`absolute top-6 left-1/2 h-0.5 w-full ${
                            step.completed ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {order.estimatedDelivery && !isDelivered && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Estimated Delivery: <span className="font-semibold text-primary-600">
                    {formatDateTime(order.estimatedDelivery)}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Live Tracking Section */}
        {showTracking && socket && (order.status === 'out_for_delivery' || order.status === 'ready') && (
          <div className="mb-6">
            <LiveTracking orderId={id} socket={socket} />
          </div>
        )}

        {/* Cancelled Status */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Order Cancelled</h3>
                {order.cancellationReason && (
                  <p className="text-sm text-red-700 mt-1">Reason: {order.cancellationReason}</p>
                )}
                {order.cancelledAt && (
                  <p className="text-xs text-red-600 mt-1">
                    Cancelled on {formatDateTime(order.cancelledAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Restaurant Info */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">Restaurant Details</h2>
              <Link
                to={`/restaurant/${order.restaurantId._id}`}
                className="flex items-center hover:bg-gray-50 p-3 rounded-lg transition"
              >
                <img
                  src={order.restaurantId.image || 'https://via.placeholder.com/80'}
                  alt={order.restaurantId.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-lg">{order.restaurantId.name}</h3>
                  {order.restaurantId.phone && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      {order.restaurantId.phone}
                    </div>
                  )}
                </div>
                <span className="text-primary-600 text-sm">View Menu →</span>
              </Link>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center border-b pb-4 last:border-b-0 last:pb-0 gap-3">
                    <img
                      src={item.image || 'https://via.placeholder.com/60'}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">Delivery Address</h2>
              <div className="flex">
                <MapPinIcon className="h-6 w-6 text-primary-600 mr-3 flex-shrink-0" />
                <div>
                  {order.addressId ? (
                    <>
                      <p className="font-semibold capitalize">{order.addressId.type}</p>
                      <p className="text-gray-700">{order.addressId.street}</p>
                      <p className="text-gray-700">
                        {order.addressId.city}, {order.addressId.state} - {order.addressId.zipCode}
                      </p>
                      {order.addressId.landmark && (
                        <p className="text-sm text-gray-600 mt-1">
                          Landmark: {order.addressId.landmark}
                        </p>
                      )}
                    </>
                  ) : order.deliveryAddress ? (
                    <>
                      <p className="text-gray-700">{order.deliveryAddress.street}</p>
                      <p className="text-gray-700">
                        {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Address not available</p>
                  )}
                  {order.deliveryInstructions && (
                    <div className="mt-3 bg-yellow-50 p-3 rounded border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-800">Delivery Instructions:</p>
                      <p className="text-sm text-yellow-700">{order.deliveryInstructions}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Payment & Bill Summary */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 sticky top-20 md:top-24">
              <h2 className="text-xl font-bold mb-4">Bill Details</h2>
              
              <div className="space-y-3 mb-4 pb-4 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (5%)</span>
                  <span className="font-medium">{formatCurrency(order.tax)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                    <span className="font-medium">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Total Amount</span>
                <span className="text-primary-600">{formatCurrency(order.total)}</span>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-semibold capitalize">
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                         order.paymentMethod === 'card' ? 'Credit/Debit Card' :
                         order.paymentMethod === 'upi' ? 'UPI' : order.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div>
                    {order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        Payment Pending
                      </span>
                    )}
                    {order.paymentStatus === 'completed' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        ✓ Paid
                      </span>
                    )}
                    {order.paymentStatus === 'pending' && order.paymentMethod === 'cod' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        Pay on Delivery
                      </span>
                    )}
                  </div>
                </div>
                {order.paymentStatus === 'completed' && order.status === 'pending' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800">
                      ✓ Payment received! Your order is waiting for restaurant confirmation.
                    </p>
                  </div>
                )}
                {order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Payment gateway not integrated. Restaurant owner should not process this order until payment is confirmed.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {canCancel && !isCancelled && (
                <button
                  onClick={() => setShowCancellationModal(true)}
                  disabled={cancelling}
                  className="w-full btn-outline border-red-500 text-red-500 hover:bg-red-50 mb-3"
                >
                  Cancel Order
                </button>
              )}

              {/* Track Order Button */}
              {(order.status === 'out_for_delivery' || order.status === 'ready') && (
                <button
                  onClick={() => setShowTracking(!showTracking)}
                  className="w-full btn-primary flex items-center justify-center gap-2 mb-3"
                >
                  <TruckIcon className="w-5 h-5" />
                  {showTracking ? 'Hide Tracking' : 'Track Order'}
                </button>
              )}

              {isDelivered && (
                <div className="space-y-3">
                  {!order.reviewId && (
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      <StarIcon className="w-5 h-5" />
                      Rate this Order
                    </button>
                  )}
                  {order.reviewId && (
                    <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                      <p className="text-green-800 text-sm font-medium">✓ You've reviewed this order</p>
                    </div>
                  )}
                  <Link
                    to={`/restaurant/${order.restaurantId._id}`}
                    className="w-full btn-outline block text-center"
                  >
                    Order Again
                  </Link>
                </div>
              )}
            </div>

            {/* Help & Support */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Need Help?</h3>
              
              {/* Restaurant Contact */}
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600 mb-2">
                  For order-related queries, contact the restaurant:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-900">
                    <BuildingStorefrontIcon className="h-4 w-4 mr-2 text-orange-500" />
                    <span className="font-medium">{order.restaurantId?.name}</span>
                  </div>
                  {order.restaurantId?.phone && (
                    <div className="flex items-center text-primary-600">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      <a href={`tel:${order.restaurantId.phone}`} className="hover:underline">
                        {order.restaurantId.phone}
                      </a>
                    </div>
                  )}
                  {order.restaurantId?.email && (
                    <div className="flex items-center text-primary-600 text-sm">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${order.restaurantId.email}`} className="hover:underline">
                        {order.restaurantId.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* FlashBites Support */}
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  For platform support:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-900">
                    <span className="font-medium text-orange-600">FlashBites Support</span>
                  </div>
                  <div className="flex items-center text-primary-600">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    <a href="tel:7068247779" className="hover:underline">
                      +91 70682 47779
                    </a>
                  </div>
                  <div className="flex items-center text-primary-600 text-sm">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href="mailto:flashbites@gmail.com" className="hover:underline">
                      flashbites@gmail.com
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Available 24/7 for payment, refund, and technical issues
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          fetchOrderDetails(); // Refresh to show review submitted
        }}
        order={order}
      />

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        onConfirm={handleCancelOrder}
        order={order}
        loading={cancelling}
      />
    </div>
  );
};

export default OrderDetail;
