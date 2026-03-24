import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  getAvailableOrders,
  getAssignedOrders,
  acceptOrder,
  markAsDelivered,
  getOrderHistory,
  getDeliveryStats,
  getDutyStatus,
  updateDutyStatus
} from '../api/deliveryPartnerApi';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('available');
  const [availableOrders, setAvailableOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historySummary, setHistorySummary] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    avgEarningPerOrder: 0
  });
  const [historyTimeframe, setHistoryTimeframe] = useState('day');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [dutyStatusUpdatedAt, setDutyStatusUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [dutyUpdating, setDutyUpdating] = useState(false);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);


  // Get active order ID for location tracking
  const activeOrderId = assignedOrders.find(order => 
    order.status === 'out_for_delivery' || order.status === 'ready'
  )?._id;

  // Use location tracking hook
  const { currentLocation, error: locationError, isTracking } = useLocationTracking(
    activeOrderId,
    locationTrackingEnabled,
    10000 // Send location every 10 seconds
  );

  // Set up socket listeners
  useEffect(() => {
    if (!user || user.role !== 'delivery_partner') return;

    // Listen for new order notifications
    const handleNewOrder = (data) => {
      console.log('🔄 Dashboard: Auto-refreshing data on available order:', data.order?._id);
      if (autoRefreshEnabled) fetchData(); // Refresh orders
    };

    // Listen for order assignment
    const handleOrderAssigned = (data) => {
      console.log('🔄 Dashboard: Auto-refreshing data on assigned order:', data.order?._id);
      if (autoRefreshEnabled) fetchData(); // Refresh orders
    };

    // Listen for order cancellation
    const handleOrderCancelled = (data) => {
      console.log('🔄 Dashboard: Auto-refreshing data on cancelled order:', data.order?._id);
      if (autoRefreshEnabled) fetchData(); // Refresh orders
    };

    socketService.on('new-order-available', handleNewOrder);
    socketService.on('order-assigned', handleOrderAssigned);
    socketService.on('order-cancelled', handleOrderCancelled);

    return () => {
      socketService.off('new-order-available');
      socketService.off('order-assigned');
      socketService.off('order-cancelled');
    };
  }, [user, autoRefreshEnabled]);

  useEffect(() => {
    if (!autoRefreshEnabled || !user || user.role !== 'delivery_partner') return;

    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, user]);

  useEffect(() => {
    if (!user || user.role !== 'delivery_partner') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (locationError) {
      toast.error(locationError);
    }
  }, [locationError]);


  const fetchData = async () => {
    setLoading(true);
    try {
      const [availableRes, assignedRes, statsRes, dutyRes] = await Promise.all([
        getAvailableOrders(),
        getAssignedOrders(),
        getDeliveryStats(),
        getDutyStatus()
      ]);
      setAvailableOrders(availableRes?.data?.orders || []);
      setAssignedOrders(assignedRes?.data?.orders || []);
      setStats(statsRes?.data || {});
      setIsOnDuty(Boolean(dutyRes?.data?.isOnDuty));
      setDutyStatusUpdatedAt(dutyRes?.data?.dutyStatusUpdatedAt || null);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDutyToggle = async () => {
    setDutyUpdating(true);
    try {
      const nextDutyStatus = !isOnDuty;
      const response = await updateDutyStatus(nextDutyStatus);
      setIsOnDuty(Boolean(response?.data?.isOnDuty));
      setDutyStatusUpdatedAt(response?.data?.dutyStatusUpdatedAt || null);
      toast.success(nextDutyStatus ? 'You are now on duty' : 'You are now off duty');

      if (nextDutyStatus) {
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update duty status');
    } finally {
      setDutyUpdating(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    setActionLoading(orderId);
    try {
      await acceptOrder(orderId);
      toast.success('Order accepted successfully!');
      fetchData();
      setActiveTab('assigned');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setActionLoading(orderId);
    try {
      await markAsDelivered(orderId);
      toast.success('Order marked as delivered!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchOrderHistory = async (timeframe = historyTimeframe) => {
    setHistoryLoading(true);
    try {
      const response = await getOrderHistory({ timeframe, page: 1, limit: 100 });
      setHistoryOrders(response?.data?.orders || []);
      setHistorySummary(response?.data?.summary || {
        totalDeliveries: 0,
        totalEarnings: 0,
        avgEarningPerOrder: 0
      });
    } catch (error) {
      toast.error('Failed to load order history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && user?.role === 'delivery_partner') {
      fetchOrderHistory(historyTimeframe);
    }
  }, [activeTab, historyTimeframe, user]);

  const getEtaLabel = (order) => {
    if (!order?.estimatedDelivery) return null;
    const mins = Math.max(0, Math.round((new Date(order.estimatedDelivery).getTime() - Date.now()) / 60000));
    return `${mins} min`;
  };

  const getOrderEarning = (order) => {
    const earning = Number(order?.deliveryPartnerEarning);
    if (Number.isFinite(earning) && earning > 0) return earning;
    return Number(order?.deliveryFee) || 0;
  };

  const buildGoogleMapsLink = (coords) => {
    const lng = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const OrderCard = ({ order, isAssigned }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Order #{order._id.slice(-6)}</h3>
          <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
          order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
          'bg-primary-100 text-primary-800'
        }`}>
          {order.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Restaurant Info */}
      <div className="mb-4 pb-4 border-b">
        <h4 className="font-semibold text-gray-900 mb-2">🏪 Pickup From:</h4>
        <p className="text-sm font-medium break-words">{order.restaurantId?.name}</p>
        <p className="text-sm text-gray-600 break-words">{order.restaurantId?.address?.street}</p>
        <p className="text-sm text-gray-600">
          {order.restaurantId?.address?.city}, {order.restaurantId?.address?.state}
        </p>
        <p className="text-sm text-primary-600 font-medium mt-1">
          📞 {order.restaurantId?.phone}
        </p>
      </div>

      {/* Delivery Info */}
      <div className="mb-4 pb-4 border-b">
        <h4 className="font-semibold text-gray-900 mb-2">📍 Deliver To:</h4>
        <p className="text-sm font-medium break-words">{order.userId?.name}</p>
        <p className="text-sm text-gray-600 break-words">{order.addressId?.street}, {order.addressId?.landmark}</p>
        <p className="text-sm text-gray-600">
          {order.addressId?.city}, {order.addressId?.state} - {order.addressId?.zipCode}
        </p>
        <p className="text-sm text-primary-600 font-medium mt-1">
          📞 {order.userId?.phone}
        </p>
      </div>

      {/* Order Items */}
      <div className="mb-4 pb-4 border-b">
        <h4 className="font-semibold text-gray-900 mb-2">📦 Items ({order.items?.length}):</h4>
        <div className="space-y-1">
          {order.items?.slice(0, 3).map((item, idx) => (
            <p key={idx} className="text-sm text-gray-600">
              • {item.name} x{item.quantity}
            </p>
          ))}
          {order.items?.length > 3 && (
            <p className="text-sm text-gray-500">+ {order.items.length - 3} more items</p>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-sm text-gray-600">Order Total</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Delivery Fee</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(order.deliveryFee)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Payment</p>
          <p className="text-sm font-semibold text-gray-900">{order.paymentMethod.toUpperCase()}</p>
        </div>
      </div>

      {getEtaLabel(order) && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          ETA Countdown: <span className="font-bold">{getEtaLabel(order)}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {buildGoogleMapsLink(order.restaurantId?.location?.coordinates) && (
          <a
            href={buildGoogleMapsLink(order.restaurantId?.location?.coordinates)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            Navigate to Restaurant
          </a>
        )}
        {buildGoogleMapsLink(order.addressId?.coordinates) && (
          <a
            href={buildGoogleMapsLink(order.addressId?.coordinates)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            Navigate to Customer
          </a>
        )}
      </div>

      {/* Action Buttons */}
      {!isAssigned ? (
        <button
          onClick={() => handleAcceptOrder(order._id)}
          disabled={actionLoading === order._id || !isOnDuty}
          className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === order._id
            ? 'Accepting...'
            : isOnDuty
              ? '✅ Accept Order'
              : 'Go On Duty to Accept'}
        </button>
      ) : (
        <button
          onClick={() => handleMarkDelivered(order._id)}
          disabled={actionLoading === order._id || order.status !== 'out_for_delivery'}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === order._id ? 'Updating...' : '✓ Mark as Delivered'}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto container-px">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Delivery Partner Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user?.name}! 🚴</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleDutyToggle}
                  disabled={dutyUpdating}
                  className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${isOnDuty ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-60`}
                >
                  {dutyUpdating ? 'Updating Duty...' : isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
                </button>
                <button
                  onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${autoRefreshEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  {autoRefreshEnabled ? 'Stop Auto Refresh' : 'Start Auto Refresh'}
                </button>
                <button
                  onClick={fetchData}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-primary-500 hover:bg-primary-600"
                >
                  Refresh Now
                </button>
              </div>
              <p className={`mt-2 text-sm font-semibold ${isOnDuty ? 'text-green-700' : 'text-amber-700'}`}>
                Duty Status: {isOnDuty ? 'On Duty' : 'Off Duty'}
                {dutyStatusUpdatedAt ? ` • Updated ${new Date(dutyStatusUpdatedAt).toLocaleTimeString()}` : ''}
              </p>
            </div>
            
            {/* Location Tracking Status */}
            <div className="bg-white rounded-lg shadow p-4 w-full sm:w-auto sm:min-w-[250px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Location Tracking</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locationTrackingEnabled}
                    onChange={(e) => setLocationTrackingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                {isTracking && activeOrderId ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">
                      Active - Tracking Order
                    </span>
                  </>
                ) : locationTrackingEnabled ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-yellow-600 font-medium">
                      Ready - No Active Order
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-600 font-medium">
                      Disabled
                    </span>
                  </>
                )}
              </div>
              {currentLocation && isTracking && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Lat: {currentLocation.latitude.toFixed(6)}<br/>
                    Lng: {currentLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDeliveries || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Today's Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayDeliveries || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOrders || 0}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-full">
                <span className="text-2xl">🚴</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalEarnings || 0)}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'available'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Available Orders ({availableOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'assigned'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Orders ({assignedOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'history'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Order History
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        {activeTab === 'available' ? (
          availableOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableOrders.map((order) => (
                <OrderCard key={order._id} order={order} isAssigned={false} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-xl text-gray-600">No available orders at the moment</p>
              <p className="text-sm text-gray-500 mt-2">Check back soon for new delivery opportunities!</p>
            </div>
          )
        ) : activeTab === 'assigned' ? (
          assignedOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {assignedOrders.map((order) => (
                <OrderCard key={order._id} order={order} isAssigned={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-6xl mb-4">🚫</p>
              <p className="text-xl text-gray-600">No assigned orders</p>
              <p className="text-sm text-gray-500 mt-2">Accept orders from the Available Orders tab to start delivering!</p>
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {['day', 'week', 'month', 'all'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setHistoryTimeframe(period)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                        historyTimeframe === period
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fetchOrderHistory(historyTimeframe)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600"
                >
                  Refresh History
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Delivered Orders</p>
                <p className="text-2xl font-bold text-gray-900">{historySummary.totalDeliveries || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(historySummary.totalEarnings || 0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Avg Earning / Order</p>
                <p className="text-2xl font-bold text-primary-600">{formatCurrency(historySummary.avgEarningPerOrder || 0)}</p>
              </div>
            </div>

            {historyLoading ? (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Loading history...</div>
            ) : historyOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-5xl mb-3">🗂️</p>
                <p className="text-lg text-gray-600">No delivered orders found for this period.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyOrders.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Order #{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-gray-500">Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : '-'}</p>
                        <p className="text-sm text-gray-700 mt-1">Customer: {order.userId?.name || 'N/A'} ({order.userId?.phone || 'N/A'})</p>
                        <p className="text-sm text-gray-700">Restaurant: {order.restaurantId?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-1 break-words">
                          To: {order.addressId
                            ? `${order.addressId.street}, ${order.addressId.city}, ${order.addressId.state} - ${order.addressId.zipCode}`
                            : `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.zipCode || ''}`}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-sm text-gray-500">Order Total</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total || 0)}</p>
                        <p className="text-sm text-gray-500 mt-1">Your Earning</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(getOrderEarning(order))}</p>
                        {order.deliveryPartnerPayoutSnapshot?.bonusApplied && (
                          <p className="text-xs font-semibold text-amber-700 mt-1">Bonus Applied</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
