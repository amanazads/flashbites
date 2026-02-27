import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrderById } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Loader } from '../components/common/Loader';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

const demoOrders = {
  demo: {
    _id: 'demo',
    status: 'confirmed',
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
    },
    items: [
      { name: 'Spicy Zinger Burger', quantity: 2, price: 9, isVeg: false },
      { name: 'Coke (Large)', quantity: 1, price: 6.5, isVeg: true },
    ],
    addressId: {
      type: 'home',
      street: '123 Gourmet Avenue, Apt 4B',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60607',
    },
  },
};

const OrderStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (demoOrders[id]) {
        setOrder(demoOrders[id]);
        setLoading(false);
        return;
      }

      try {
        const response = await getOrderById(id);
        setOrder(response?.data?.order || null);
      } catch {
        toast.error('Failed to load order status');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  const eta = useMemo(() => {
    const status = String(order?.status || '').toLowerCase();
    if (status === 'delivered') return 'Delivered';
    if (status === 'out_for_delivery') return '10 - 20 mins';
    if (status === 'preparing') return '20 - 30 mins';
    return '25 - 30 mins';
  }, [order?.status]);

  const statusLabel = useMemo(() => {
    const status = String(order?.status || '').toLowerCase();
    if (status === 'delivered') return 'Delivered';
    if (status === 'cancelled') return 'Cancelled';
    return 'Confirmed';
  }, [order?.status]);

  const paymentLine = useMemo(() => {
    const method = String(order?.paymentMethod || '').toLowerCase();
    if (method === 'card') return 'Paid via Card';
    if (method === 'upi') return 'Paid via UPI';
    if (method === 'cod') return 'Cash on Delivery';
    return 'Payment status available in details';
  }, [order?.paymentMethod]);

  const itemTotal = useMemo(() => {
    if (!order) return 0;
    if (typeof order.subtotal === 'number') return order.subtotal;
    return (order.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  }, [order]);

  if (loading) return <Loader />;
  if (!order) return null;

  const address = order?.addressId
    ? `${order.addressId.street || ''}${order.addressId.city ? `, ${order.addressId.city}` : ''}${order.addressId.state ? `, ${order.addressId.state}` : ''}${order.addressId.zipCode ? ` ${order.addressId.zipCode}` : ''}`
    : 'Address unavailable';

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#f3f4f6] pb-24">
        <header className="sticky top-0 z-10 bg-[#f3f4f6] border-b border-slate-200 px-4 py-4">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate('/orders')}
              className="absolute left-0 w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-[20px] font-semibold text-slate-900">Order Status</h1>
          </div>
        </header>

        <main className="px-4 pt-5 space-y-5">
          <section className="text-center">
            <div className="mx-auto w-40 h-40 rounded-full bg-[#f2e6e1] flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_10px_20px_rgba(249,115,22,0.28)]">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <CheckIcon className="w-7 h-7 text-orange-500" />
                </div>
              </div>
            </div>
            <h2 className="mt-4 text-[22px] font-bold text-slate-900">Order Placed Successfully!</h2>
            <p className="mt-2 text-[14px] text-slate-500 leading-6">
              Your order <span className="font-semibold text-orange-500">#{String(order._id).slice(-8).toUpperCase()}</span> has been confirmed and is being prepared.
            </p>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Estimated Delivery</p>
                <p className="mt-1 text-[22px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-orange-500" />
                  {eta}
                </p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Status</p>
                <p className="mt-1 text-[20px] font-semibold text-emerald-600">• {statusLabel}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 p-4">
            <h3 className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
              <ShoppingBagIcon className="w-5 h-5 text-orange-500" />
              Order Summary
            </h3>
            <div className="mt-3 space-y-2.5">
              {(order.items || []).map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="h-6 min-w-[30px] px-1.5 rounded-lg bg-slate-100 text-slate-600 text-[12px] font-semibold flex items-center justify-center">
                      {item.quantity || 1}x
                    </span>
                    <p className="text-[14px] text-slate-700 truncate">{item.name}</p>
                  </div>
                  <p className="text-[14px] font-semibold text-slate-700">{formatCurrency((item.price || 0) * (item.quantity || 1))}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[14px] text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(itemTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[15px] font-bold text-orange-500">
                <span>Total Paid</span>
                <span>{formatCurrency(order.total || 0)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 p-4">
            <h3 className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-orange-500" />
              Delivery Address
            </h3>
            <div className="mt-3 flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MapPinIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-slate-900">{order?.addressId?.type ? order.addressId.type.charAt(0).toUpperCase() + order.addressId.type.slice(1) : 'Home'}</p>
                <p className="text-[14px] text-slate-500 leading-6">{address}</p>
              </div>
            </div>
          </section>

          <p className="text-[12px] text-slate-400">{paymentLine} • {formatDateTime(order.createdAt)}</p>
        </main>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 bg-[#f3f4f6] border-t border-slate-200 px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="w-full max-w-md mx-auto">
            <button
              onClick={() => navigate(`/orders/${id}/track`)}
              className="w-full h-14 rounded-full bg-orange-500 text-white text-[16px] font-semibold shadow-[0_10px_20px_rgba(249,115,22,0.28)]"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
