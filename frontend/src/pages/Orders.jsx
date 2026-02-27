import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserOrders } from '../redux/slices/orderSlice';
import { Loader } from '../components/common/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ArrowLeftIcon, MapPinIcon, PhoneIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, ShoppingBagIcon as OrdersSolid } from '@heroicons/react/24/solid';
import ReviewModal from '../components/common/ReviewModal';
import toast from 'react-hot-toast';

const Orders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((state) => state.order);
  const [activeTab, setActiveTab] = useState('active');
  const [reviewOrder, setReviewOrder] = useState(null);

  useEffect(() => {
    dispatch(fetchUserOrders());
  }, [dispatch]);

  const uniqueOrders = useMemo(() => {
    if (!orders) return [];
    const seen = new Set();
    return orders.filter((order) => {
      if (seen.has(order._id)) return false;
      seen.add(order._id);
      return true;
    });
  }, [orders]);

  const mockOrders = useMemo(
    () => [
      {
        _id: 'demo',
        status: 'on_the_way',
        createdAt: new Date().toISOString(),
        total: 24.5,
        restaurantId: {
          _id: 'demo-restaurant',
          name: 'Pizza Hut',
          image:
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
        },
        items: [
          { name: 'Margherita', quantity: 1 },
          { name: 'Coke', quantity: 2 },
        ],
        __isMock: true,
      },
      {
        _id: 'demo-past-delivered',
        status: 'delivered',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        total: 18.2,
        restaurantId: {
          _id: 'demo-restaurant-2',
          name: 'Burger King',
          image:
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
        },
        items: [
          { name: 'Whopper Meal', quantity: 1 },
          { name: 'Onion Rings', quantity: 1 },
        ],
        __isMock: true,
      },
      {
        _id: 'demo-past-cancelled',
        status: 'cancelled',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        total: 15,
        restaurantId: {
          _id: 'demo-restaurant-3',
          name: 'Green Salads',
          image:
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
        },
        items: [
          { name: 'Caesar Salad', quantity: 1 },
          { name: 'Orange Juice', quantity: 1 },
        ],
        __isMock: true,
      },
    ],
    []
  );

  const ordersForDisplay = uniqueOrders.length > 0 ? uniqueOrders : mockOrders;

  const getOrderTime = (order) => {
    if (!order?.createdAt) return '';
    return new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getRestaurantName = (order) => order?.restaurantId?.name || 'Restaurant';

  const getRestaurantImage = (order) =>
    order?.restaurantId?.image ||
    order?.restaurantId?.logo ||
    order?.restaurantId?.images?.[0] ||
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';

  const getItemsPreview = (order) => {
    if (!order?.items?.length) return 'No items';
    return order.items
      .slice(0, 2)
      .map((item) => `${item.quantity || 1}x ${item.name || 'Item'}`)
      .join(', ');
  };

  const isActiveStatus = (status = '') => {
    const s = status.toLowerCase();
    return !['delivered', 'cancelled', 'canceled', 'failed', 'refunded'].includes(s);
  };

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'delivered') return { label: 'DELIVERED', cls: 'bg-emerald-50 text-emerald-600' };
    if (['cancelled', 'canceled', 'failed', 'refunded'].includes(s)) {
      return { label: 'CANCELLED', cls: 'bg-rose-50 text-rose-500' };
    }
    return { label: 'In Progress', cls: 'bg-orange-50 text-orange-500' };
  };

  const activeOrders = useMemo(
    () =>
      ordersForDisplay
        .filter((order) => isActiveStatus(order.status))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [ordersForDisplay]
  );

  const pastOrders = useMemo(
    () =>
      ordersForDisplay
        .filter((order) => !isActiveStatus(order.status))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [ordersForDisplay]
  );

  const currentOrder = activeOrders[0];

  const handleOpenReview = (order) => {
    if (order?.__isMock) {
      toast('Rate works on real delivered orders.');
      return;
    }
    if (order?.reviewId) {
      toast.success('You already reviewed this order.');
      return;
    }
    setReviewOrder(order);
  };

  const handleViewDetails = (order) => {
    if (!order?._id) return;
    navigate(`/orders/${order._id}`);
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#F2F3F5]">
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#F2F3F5] pb-28">
        <header className="sticky top-0 z-20 bg-[#F2F3F5] px-4 pt-5 pb-4 border-b border-slate-200">
          <div className="relative flex items-center justify-center">
            <button onClick={() => navigate(-1)} className="absolute left-0 p-1.5 text-slate-900">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-[24px] font-bold text-slate-900">My Orders</h1>
          </div>
        </header>

        <div className="px-4 py-4">
          <div className="bg-[#ECE8E8] rounded-full p-1.5 flex gap-1 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
                activeTab === 'active' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400'
              }`}
            >
              Active Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
                activeTab === 'past' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400'
              }`}
            >
              Past Orders
            </button>
          </div>

          {activeTab === 'active' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-slate-900">Current Order</h2>
                {currentOrder && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStatusBadge(currentOrder.status).cls}`}>
                    {getStatusBadge(currentOrder.status).label}
                  </span>
                )}
              </div>

              {!currentOrder ? (
                <div className="bg-white rounded-3xl p-6 text-center border border-slate-200">
                  <p className="text-sm text-slate-500 mb-4">No active orders right now.</p>
                  <Link to="/restaurants" className="inline-flex items-center justify-center bg-orange-500 text-white text-sm font-semibold rounded-full px-5 py-2.5">
                    Browse Restaurants
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                  <div className="flex gap-3.5">
                    <img
                      src={getRestaurantImage(currentOrder)}
                      alt={getRestaurantName(currentOrder)}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[18px] font-bold text-slate-900 leading-tight">{getRestaurantName(currentOrder)}</h3>
                        <span className="text-[24px] font-bold text-orange-500 leading-none">{formatCurrency(currentOrder.total || 0)}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Today, {getOrderTime(currentOrder)}</p>
                      <p className="text-sm italic text-slate-500 mt-1 truncate">{getItemsPreview(currentOrder)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full w-[72%] bg-orange-500 rounded-full" />
                    </div>
                    <span className="text-[11px] font-semibold text-orange-500 tracking-wide">ESTIMATED: 15 MINS</span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      to={currentOrder.__isMock ? '/orders/demo/track' : `/orders/${currentOrder._id}/track`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-500 text-white text-sm font-semibold rounded-full py-3"
                    >
                      <MapPinIcon className="w-4 h-4" />
                      Track Order
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleViewDetails(currentOrder)}
                      className="px-3 py-3 rounded-full border border-slate-200 bg-white text-[12px] font-semibold text-slate-600"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      className="w-12 h-12 rounded-full border border-slate-200 bg-slate-50 inline-flex items-center justify-center text-slate-500"
                    >
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'past' && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">Past Orders</h2>
              {pastOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 text-center border border-slate-200">
                  <p className="text-sm text-slate-500">No past orders found yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {pastOrders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const canReorder = badge.label === 'DELIVERED' && order?.restaurantId?._id;
                    return (
                      <div key={order._id} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
                        <div className="flex gap-3">
                          <img
                            src={getRestaurantImage(order)}
                            alt={getRestaurantName(order)}
                            className={`w-16 h-16 rounded-2xl object-cover border border-slate-200 ${badge.label === 'CANCELLED' ? 'grayscale opacity-50' : ''}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={`text-[16px] font-bold truncate ${badge.label === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                {getRestaurantName(order)}
                              </h3>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                            </div>
                            <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                            <p className="text-sm text-slate-500 mt-0.5 truncate">{getItemsPreview(order)}</p>
                          </div>
                        </div>
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[24px] font-bold text-slate-800">{formatCurrency(order.total || 0)}</span>
                          <div className="flex items-center gap-2">
                          {canReorder ? (
                            order.reviewId ? (
                              <span className="px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-[13px] font-semibold text-emerald-600">
                                Reviewed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReview(order)}
                                className="px-4 py-2 rounded-full border border-slate-200 text-[13px] font-semibold text-slate-500"
                              >
                                Rate
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDetails(order)}
                              className="px-4 py-2 rounded-full border border-slate-200 text-[13px] font-semibold text-slate-500"
                            >
                              View Details
                            </button>
                          )}
                          {canReorder && (
                            <button
                              type="button"
                                onClick={() => navigate(`/restaurant/${order.restaurantId._id}`)}
                                className="px-4 py-2 rounded-full bg-orange-500 text-white text-[13px] font-semibold"
                              >
                                Reorder
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
          style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-md mx-auto grid grid-cols-4 px-2 py-2">
            <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 py-1">
              <HomeSolid className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-medium">Home</span>
            </button>
            <button onClick={() => navigate('/restaurants')} className="flex flex-col items-center gap-1 py-1">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-medium">Explore</span>
            </button>
            <button onClick={() => navigate('/orders')} className="relative flex flex-col items-center gap-1 py-1">
              <OrdersSolid className="w-5 h-5 text-orange-500" />
              <span className="text-[10px] text-orange-500 font-semibold">Orders</span>
              <span className="absolute top-0.5 right-[34%] w-2 h-2 rounded-full bg-orange-500" />
            </button>
            <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 py-1">
              <UserCircleIcon className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-medium">Profile</span>
            </button>
          </div>
        </div>
      </div>

      <ReviewModal
        isOpen={Boolean(reviewOrder)}
        onClose={() => {
          setReviewOrder(null);
          dispatch(fetchUserOrders());
        }}
        order={reviewOrder}
      />
    </div>
  );
};

export default Orders;
