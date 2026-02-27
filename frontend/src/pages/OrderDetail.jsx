import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrderById, cancelOrder } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Loader } from '../components/common/Loader';
import ReviewModal from '../components/common/ReviewModal';
import CancellationModal from '../components/common/CancellationModal';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  MapPinIcon,
  StarIcon,
  PhoneIcon,
  CreditCardIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrderDetails = async () => {
    const demoOrders = {
      demo: {
        _id: 'demo',
        status: 'out_for_delivery',
        createdAt: new Date().toISOString(),
        total: 24.5,
        subtotal: 22,
        deliveryFee: 0,
        tax: 2.5,
        discount: 0,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        restaurantId: {
          _id: 'demo-restaurant',
          name: 'Pizza Hut',
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
          phone: '18001234567',
          address: "123 King's Way, Royal Court",
        },
        items: [
          { name: 'Margherita Pizza', quantity: 1, price: 18.5, isVeg: true },
          { name: 'Coke', quantity: 2, price: 3, isVeg: true },
        ],
        addressId: {
          type: 'home',
          street: '452 Orange Lane',
          city: 'Citrus Valley',
          state: 'CA',
          zipCode: '90210',
        },
      },
      'demo-past-delivered': {
        _id: 'demo-past-delivered',
        status: 'delivered',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        total: 18.2,
        subtotal: 16,
        deliveryFee: 0,
        tax: 2.2,
        discount: 0,
        paymentMethod: 'upi',
        paymentStatus: 'completed',
        restaurantId: {
          _id: 'demo-restaurant-2',
          name: 'Burger King',
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
          phone: '18001234567',
          address: "123 King's Way, Royal Court",
        },
        items: [
          { name: 'Whopper Meal', quantity: 1, price: 12.2, isVeg: false },
          { name: 'Onion Rings', quantity: 1, price: 6, isVeg: true },
        ],
        addressId: {
          type: 'home',
          street: '452 Orange Lane',
          city: 'Citrus Valley',
          state: 'CA',
          zipCode: '90210',
        },
      },
      'demo-past-cancelled': {
        _id: 'demo-past-cancelled',
        status: 'cancelled',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        total: 15,
        subtotal: 14,
        deliveryFee: 0,
        tax: 1,
        discount: 0,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        restaurantId: {
          _id: 'demo-restaurant-3',
          name: 'Green Salads',
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
          phone: '18001234567',
          address: 'Citrus Valley',
        },
        items: [
          { name: 'Caesar Salad', quantity: 1, price: 10, isVeg: true },
          { name: 'Orange Juice', quantity: 1, price: 5, isVeg: true },
        ],
        addressId: {
          type: 'home',
          street: '452 Orange Lane',
          city: 'Citrus Valley',
          state: 'CA',
          zipCode: '90210',
        },
      },
    };

    if (demoOrders[id]) {
      setOrder(demoOrders[id]);
      setLoading(false);
      return;
    }

    try {
      const response = await getOrderById(id);
      setOrder(response.data.order);
    } catch {
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

  const paymentLabel = (method) => {
    if (method === 'cod') return 'Cash on Delivery';
    if (method === 'card') return 'Card payment';
    if (method === 'upi') return 'UPI payment';
    return method || 'Payment method';
  };

  const getAddress = () => {
    if (order?.addressId) {
      return {
        title: order.addressId.type ? order.addressId.type.charAt(0).toUpperCase() + order.addressId.type.slice(1) : 'Address',
        line1: order.addressId.street || '',
        line2: [order.addressId.city, order.addressId.state, order.addressId.zipCode].filter(Boolean).join(', '),
      };
    }
    if (order?.deliveryAddress) {
      return {
        title: 'Delivery Address',
        line1: order.deliveryAddress.street || '',
        line2: [order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.zipCode].filter(Boolean).join(', '),
      };
    }
    return { title: 'Address', line1: 'Address not available', line2: '' };
  };

  const isVegItem = (item = {}) => {
    if (typeof item.isVeg === 'boolean') return item.isVeg;
    const name = String(item.name || '').toLowerCase();
    return !['chicken', 'mutton', 'fish', 'egg', 'prawn', 'beef'].some((k) => name.includes(k));
  };

  const isDelivered = order?.status === 'delivered';
  const isCancelled = order?.status === 'cancelled';
  const canCancel = ['pending', 'confirmed'].includes(order?.status);

  const itemTotal = useMemo(() => {
    if (!order) return 0;
    if (typeof order.subtotal === 'number') return order.subtotal;
    return (order.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  }, [order]);

  if (loading) return <Loader />;
  if (!order) return null;

  const address = getAddress();
  const orderCode = `#FB-${String(order._id || '').slice(-5).toUpperCase()}`;
  const statusClass = isDelivered
    ? 'bg-emerald-50 text-emerald-600'
    : isCancelled
    ? 'bg-rose-50 text-rose-600'
    : 'bg-orange-50 text-orange-600';
  const statusLabel = isDelivered ? 'Delivered' : isCancelled ? 'Cancelled' : 'In Progress';

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#f3f4f6] pb-8">
        <header className="sticky top-0 z-10 bg-[#f3f4f6] border-b border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/orders')}
              className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-[20px] font-semibold text-slate-900">Order Details</h1>
            <button
              onClick={() => navigate('/help')}
              className="w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="px-4 pt-4 space-y-5">
          <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusClass}`}>
                  <CheckCircleIcon className="w-4 h-4" />
                  {statusLabel}
                </span>
                <h2 className="mt-2 text-[30px] leading-tight font-bold text-slate-900">Order {orderCode}</h2>
                <p className="mt-1 text-[13px] text-slate-500">{formatDateTime(order.createdAt)}</p>
              </div>
              <img
                src={order?.restaurantId?.image || 'https://via.placeholder.com/120'}
                alt={order?.restaurantId?.name || 'Restaurant'}
                className="w-20 h-14 rounded-2xl object-cover border border-slate-200"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link
                to={order?.restaurantId?._id ? `/restaurant/${order.restaurantId._id}` : '/restaurants'}
                className="h-10 rounded-full bg-orange-500 text-white text-[14px] font-semibold flex items-center justify-center gap-1.5"
              >
                Reorder
              </Link>
              {isDelivered && !order.reviewId ? (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="h-10 rounded-full border border-orange-200 text-orange-500 text-[14px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <StarIcon className="w-4 h-4" />
                  Rate Order
                </button>
              ) : (
                <button
                  disabled
                  className="h-10 rounded-full border border-slate-200 text-slate-400 text-[14px] font-semibold flex items-center justify-center"
                >
                  {order.reviewId ? 'Rated' : 'Rate Order'}
                </button>
              )}
            </div>

            {canCancel && (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {canCancel && (
                  <button
                    onClick={() => setShowCancellationModal(true)}
                    className="h-10 rounded-full border border-rose-200 text-rose-500 text-[13px] font-semibold col-span-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2">Delivery Address</h3>
            <div className="rounded-3xl bg-white border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <MapPinIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-slate-900">{address.title}</p>
                  <p className="text-[14px] text-slate-500">{address.line1}</p>
                  {address.line2 && <p className="text-[14px] text-slate-500">{address.line2}</p>}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2">Restaurant</h3>
            <div className="rounded-3xl bg-white border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <img
                  src={order?.restaurantId?.image || 'https://via.placeholder.com/80'}
                  alt={order?.restaurantId?.name || 'Restaurant'}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[18px] font-semibold text-slate-900 truncate">{order?.restaurantId?.name || 'Restaurant'}</p>
                  <p className="text-[13px] text-slate-500 truncate">
                    {order?.restaurantId?.address || [order?.addressId?.city, order?.addressId?.state].filter(Boolean).join(', ') || 'Address unavailable'}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-[13px] font-semibold text-orange-500">
                    <Link to={order?.restaurantId?._id ? `/restaurant/${order.restaurantId._id}` : '/restaurants'}>View Menu</Link>
                    <a href={order?.restaurantId?.phone ? `tel:${order.restaurantId.phone}` : 'tel:18001234567'} className="inline-flex items-center gap-1">
                      <PhoneIcon className="w-3.5 h-3.5" />
                      Contact
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2">Order Summary</h3>
            <div className="rounded-3xl bg-white border border-slate-200 p-4">
              <div className="space-y-3">
                {(order.items || []).map((item, index) => {
                  const veg = isVegItem(item);
                  return (
                    <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              veg ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                          >
                            {veg ? 'Veg' : 'Non-Veg'}
                          </span>
                          <p className="text-[14px] font-semibold text-slate-800 truncate">
                            {item.name} <span className="text-[12px] font-medium text-slate-400">x {item.quantity || 1}</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-[14px] font-semibold text-slate-800 shrink-0">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2">Bill Details</h3>
            <div className="rounded-3xl bg-white border border-slate-200 p-4">
              <div className="space-y-2.5 text-[14px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Item Total</span>
                  <span>{formatCurrency(itemTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span className={(order.deliveryFee || 0) === 0 ? 'text-emerald-600 font-semibold' : ''}>
                    {(order.deliveryFee || 0) === 0 ? 'FREE' : formatCurrency(order.deliveryFee || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Taxes and Charges</span>
                  <span>{formatCurrency(order.tax || 0)}</span>
                </div>
                {(order.discount || 0) > 0 && (
                  <div className="flex items-center justify-between text-orange-500">
                    <span>FlashBites Discount</span>
                    <span>-{formatCurrency(order.discount || 0)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[21px] font-semibold text-slate-900">Total Amount</span>
                <span className="text-[28px] font-bold text-orange-500">{formatCurrency(order.total || 0)}</span>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 text-[12px] text-slate-500 pb-2">
            <CreditCardIcon className="w-4 h-4 text-slate-400" />
            <span>
              Paid via {paymentLabel(order.paymentMethod)}
              {order.paymentStatus ? ` • ${order.paymentStatus}` : ''}
            </span>
          </div>
        </main>
      </div>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          fetchOrderDetails();
        }}
        order={order}
      />

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
