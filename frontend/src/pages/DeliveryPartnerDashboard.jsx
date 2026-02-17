import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  getAvailableOrders,
  getAssignedOrders,
  acceptOrder,
  markAsDelivered,
  getDeliveryStats
} from '../api/deliveryPartnerApi';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('available');
  const [availableOrders, setAvailableOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
  const [socket, setSocket] = useState(null);

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

  // Initialize socket connection
  useEffect(() => {
    if (!user || user.role !== 'delivery_partner') return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = API_URL.replace('/api', '');
    
    const newSocket = io(baseUrl, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('🔌 Delivery partner socket connected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for new order notifications
    newSocket.on('new-order-available', (data) => {
      console.log('🆕 New order available:', data);
      playNotificationSound();
      toast.success(
        <div>
          <strong>New Order Available!</strong>
          <p className="text-sm">Order #{data.order._id.slice(-8)} - ₹{data.order.deliveryFee} delivery fee</p>
        </div>,
        {
          duration: 5000,
          icon: '🆕',
        }
      );
      fetchData(); // Refresh orders
    });

    // Listen for order assignment
    newSocket.on('order-assigned', (data) => {
      console.log('✅ Order assigned:', data);
      playNotificationSound();
      toast.success(
        <div>
          <strong>Order Assigned!</strong>
          <p className="text-sm">Order #{data.order._id.slice(-8)}</p>
        </div>,
        {
          duration: 4000,
          icon: '✅',
        }
      );
      fetchData(); // Refresh orders
    });

    // Listen for order cancellation
    newSocket.on('order-cancelled', (data) => {
      console.log('❌ Order cancelled:', data);
      playNotificationSound();
      toast.error(
        <div>
          <strong>Order Cancelled</strong>
          <p className="text-sm">Order #{data.order._id.slice(-8)} has been cancelled</p>
        </div>,
        {
          duration: 4000,
        }
      );
      fetchData(); // Refresh orders
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

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

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OmWUwwUUKbj8LZjHAU5j9fxzn0pBSh+zPLaizsKGGS78+mcTwwNTKHh8LplHgU6jtjvz3opBSh+zPLaizsKGGS78+mcTw'); 
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Could not play sound:', err));
    } catch (error) {
      console.log('Sound playback error:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [availableRes, assignedRes, statsRes] = await Promise.all([
        getAvailableOrders(),
        getAssignedOrders(),
        getDeliveryStats()
      ]);
      setAvailableOrders(availableRes.data.orders || []);
      setAssignedOrders(assignedRes.data.orders || []);
      setStats(statsRes.data || {});
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  const OrderCard = ({ order, isAssigned }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Order Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Order #{order._id.slice(-6)}</h3>
          <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
          order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {order.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Restaurant Info */}
      <div className="mb-4 pb-4 border-b">
        <h4 className="font-semibold text-gray-900 mb-2">🏪 Pickup From:</h4>
        <p className="text-sm font-medium">{order.restaurantId?.name}</p>
        <p className="text-sm text-gray-600">{order.restaurantId?.address?.street}</p>
        <p className="text-sm text-gray-600">
          {order.restaurantId?.address?.city}, {order.restaurantId?.address?.state}
        </p>
        <p className="text-sm text-orange-600 font-medium mt-1">
          📞 {order.restaurantId?.phone}
        </p>
      </div>

      {/* Delivery Info */}
      <div className="mb-4 pb-4 border-b">
        <h4 className="font-semibold text-gray-900 mb-2">📍 Deliver To:</h4>
        <p className="text-sm font-medium">{order.userId?.name}</p>
        <p className="text-sm text-gray-600">{order.addressId?.street}, {order.addressId?.landmark}</p>
        <p className="text-sm text-gray-600">
          {order.addressId?.city}, {order.addressId?.state} - {order.addressId?.zipCode}
        </p>
        <p className="text-sm text-orange-600 font-medium mt-1">
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
      <div className="flex justify-between items-center mb-4">
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

      {/* Action Buttons */}
      {!isAssigned ? (
        <button
          onClick={() => handleAcceptOrder(order._id)}
          disabled={actionLoading === order._id}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {actionLoading === order._id ? 'Accepting...' : '✅ Accept Order'}
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Delivery Partner Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user?.name}! 🚴</p>
            </div>
            
            {/* Location Tracking Status */}
            <div className="bg-white rounded-lg shadow p-4 min-w-[250px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Location Tracking</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locationTrackingEnabled}
                    onChange={(e) => setLocationTrackingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
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
              <div className="bg-orange-100 p-3 rounded-full">
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
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Available Orders ({availableOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 py-4 px-6 font-semibold transition ${
                activeTab === 'assigned'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Orders ({assignedOrders.length})
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
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
