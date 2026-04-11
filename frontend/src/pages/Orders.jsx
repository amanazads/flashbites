import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserOrders } from '../redux/slices/orderSlice';
import { Loader } from '../components/common/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS } from '../utils/constants';
import {
  ArrowLeftIcon,
  ClockIcon,
  ShoppingBagIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { BRAND } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

/* ─── Status config ─── */
const STATUS_CONFIG = {
  pending:            { label: 'Pending',     color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  confirmed:          { label: 'Confirmed',   color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6' },
  preparing:          { label: 'Preparing',   color: '#8B5CF6', bg: '#F5F3FF', dot: '#8B5CF6' },
  ready:              { label: 'Ready',       color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  out_for_delivery:   { label: 'On the way',  color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6' },
  delivered:          { label: 'Delivered',   color: '#1BA672', bg: '#ECFDF5', dot: '#1BA672' },
  cancelled:          { label: 'Cancelled',   color: '#EA580C', bg: '#FFF7ED', dot: '#EA580C' },
  canceled:           { label: 'Cancelled',   color: '#EA580C', bg: '#FFF7ED', dot: '#EA580C' },
  failed:             { label: 'Failed',      color: '#EA580C', bg: '#FFF7ED', dot: '#EA580C' },
  refunded:           { label: 'Refunded',    color: '#6B7280', bg: '#F3F4F6', dot: '#6B7280' },
};

const getStatus = (s = '') => STATUS_CONFIG[s.toLowerCase()] || { label: s || 'Unknown', color: '#6B7280', bg: '#F3F4F6', dot: '#6B7280' };

const isActiveStatus = (s = '') =>
  !['delivered', 'cancelled', 'canceled', 'failed', 'refunded'].includes(s.toLowerCase());

const getRestaurantImage = (order) =>
  order?.restaurantId?.image ||
  order?.restaurantId?.logo ||
  order?.restaurantId?.images?.[0] ||
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80';

/* ─── Empty state ─── */
const EmptyState = ({ isActive, t }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div
      className="w-20 h-20 rounded-2xl mb-5 flex items-center justify-center"
      style={{ background: '#FFF7ED' }}
    >
      <ShoppingBagIcon className="w-9 h-9" style={{ color: BRAND }} />
    </div>
    <h3 className="text-[18px] font-bold text-gray-900 mb-1">
      {isActive ? t('orders.noActive', 'No active orders') : t('orders.noPast', 'No past orders')}
    </h3>
    <p className="text-[13px] text-gray-400 mb-6 max-w-[240px]">
      {isActive
        ? t('orders.activeHelp', 'Your current orders will appear here.')
        : t('orders.pastHelp', 'Your delivered and past orders will show up here.')}
    </p>
    <Link
      to="/restaurants"
      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[14px] font-bold text-white"
      style={{
        background: BRAND,
        boxShadow: 'none',
      }}
    >
      <ShoppingBagIcon className="w-4 h-4" />
      {t('orders.browseRestaurants', 'Browse Restaurants')}
    </Link>
  </div>
);

/* ─── Order card ─── */
const OrderCard = ({ order, t }) => {
  const navigate = useNavigate();
  const status = getStatus(order.status);
  const isActive = isActiveStatus(order.status);
  const itemPreview = order.items?.slice(0, 2).map((i) => `${i.name}`).join(', ') || 'Items';
  const moreCount = (order.items?.length || 0) - 2;

  return (
    <button
      onClick={() => navigate(`/orders/${order._id}`)}
      className="w-full bg-[#F4F4F4] border border-[#E6E0D9] rounded-[26px] overflow-hidden text-left transition-all active:scale-[0.985]"
    >
      {/* Restaurant image strip */}
      <div className="relative h-[126px] overflow-hidden">
        <img
          src={getRestaurantImage(order)}
          alt={order.restaurantId?.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(23,20,21,0.55) 0%, rgba(23,20,21,0.08) 60%, transparent 100%)' }} />

        {/* Restaurant name on image */}
        <div className="absolute bottom-0 left-0 p-3.5">
          <p className="text-white font-bold text-[16px] leading-tight">
            {order.restaurantId?.name || 'Restaurant'}
          </p>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: status.bg, color: status.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: status.dot,
                boxShadow: isActive ? `0 0 0 3px ${status.dot}33` : 'none',
                animation: isActive ? 'pulse 2s infinite' : 'none',
              }}
            />
            {status.label}
          </span>
        </div>
      </div>

      {/* Order details */}
      <div className="p-4">
        {/* Items preview */}
        <p className="text-[13px] text-gray-500 mb-2 line-clamp-1">
          {itemPreview}
          {moreCount > 0 && <span className="text-gray-400"> +{moreCount} more</span>}
        </p>

        {/* Bottom row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[16px] font-bold text-gray-900">
              {formatCurrency(order.total)}
            </span>
            <span
              className="text-[11px] font-medium text-gray-400 flex items-center gap-1"
            >
              <ClockIcon className="w-3.5 h-3.5" />
              {formatDateTime(order.createdAt)}
            </span>
          </div>

          <span
            className="text-[12px] font-bold px-3 py-1.5 rounded-xl"
            style={{ background: '#FCE9D8', color: BRAND }}
          >
            {t('orders.viewDetails', 'View Details')}
          </span>
        </div>
      </div>
    </button>
  );
};

/* ─── Main ─── */
const Orders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((state) => state.order);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => { dispatch(fetchUserOrders()); }, [dispatch]);

  const uniqueOrders = useMemo(() => {
    if (!orders) return [];
    const seen = new Set();
    return orders.filter((o) => {
      if (seen.has(o._id)) return false;
      seen.add(o._id);
      return true;
    });
  }, [orders]);

  const activeOrders = useMemo(
    () => uniqueOrders.filter((o) => isActiveStatus(o.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [uniqueOrders]
  );
  const pastOrders = useMemo(
    () => uniqueOrders.filter((o) => !isActiveStatus(o.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [uniqueOrders]
  );
  const displayOrders = activeTab === 'active' ? activeOrders : pastOrders;

  const isNavActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/restaurants') return location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/restaurant/');
    if (path === '/orders') return location.pathname.startsWith('/orders');
    if (path === '/profile') return location.pathname.startsWith('/profile');
    return false;
  };

  return (
    <div className="min-h-screen bg-[#F5F3F1]">
      <div className="max-w-md mx-auto min-h-screen pb-28">

        {/* ── Header ── */}
        <div
          className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),10px)] pb-4 bg-[#F5F3F1]"
          style={{ borderBottom: '1px solid #ECE4DC' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#171415] flex-shrink-0"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1
              className="text-[22px] font-black text-[#171415] flex-1"
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('orders.title', 'My Orders')}
            </h1>
            {uniqueOrders.length > 0 && (
              <span
                className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#FCE9D8', color: BRAND }}
              >
                {uniqueOrders.length}
              </span>
            )}
          </div>

          {/* Pill tabs */}
          <div
            className="flex rounded-2xl p-1 max-[388px]:p-0.5"
            style={{ background: '#EEE8E2' }}
          >
            {[
              { id: 'active', label: t('orders.active', 'Active'), count: activeOrders.length },
              { id: 'past',   label: t('orders.past', 'Past'), count: pastOrders.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 max-[388px]:py-2 rounded-xl text-[13.5px] max-[388px]:text-[12px] font-semibold transition-all"
                style={
                  activeTab === tab.id
                    ? { background: 'white', color: BRAND, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }
                    : { color: '#9A8F85' }
                }
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="text-[10px] font-bold w-5 h-5 max-[388px]:w-4 max-[388px]:h-4 rounded-full flex items-center justify-center"
                    style={
                      activeTab === tab.id
                        ? { background: BRAND, color: 'white' }
                        : { background: '#C9B8A7', color: 'white' }
                    }
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-4 py-4">
          {loading ? (
            <Loader />
          ) : displayOrders.length === 0 ? (
            <EmptyState isActive={activeTab === 'active'} t={t} />
          ) : (
            <div className="space-y-3">
              {displayOrders.map((order) => (
                <OrderCard key={order._id} order={order} t={t} />
              ))}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#E6E2DE] bg-[#F5F3F1]" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-6 pt-2 flex items-center justify-between text-[#B0ACA8]">
            <Link to="/" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <HomeIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('common.home', 'Home')}</span>
            </Link>
            <Link to="/restaurants" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/restaurants') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('common.search', 'Search')}</span>
            </Link>
            <Link to="/orders" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/orders') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <ShoppingBagIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('nav.orders', 'Orders')}</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/profile') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <UserCircleIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('common.profile', 'Profile')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;