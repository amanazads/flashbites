import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  getAvailableOrders,
  getAssignedOrders,
  acceptOrder,
  markAsDelivered,
  getDeliveryStats
} from '../api/deliveryPartnerApi';
import { updateOrderStatus } from '../api/orderApi';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { calculateDistance } from '../utils/helpers';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  TruckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { playNotificationSound } from '../utils/notificationSound';

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
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [socket, setSocket] = useState(null);
  const autoRefreshInterval = useRef(null);

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
      playNotificationSound('new-order');
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
      playNotificationSound('order-update');
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
      playNotificationSound('alert');
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

    // Listen for order status updates
    newSocket.on('order-status-update', (data) => {
      console.log('📝 Order status updated:', data);
      playNotificationSound('order-update');
      toast.info(`Order #${data.order._id.slice(-8)} is now ${data.order.status}`);
      fetchData(); // Refresh orders
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefreshEnabled) {
      console.log('✅ Auto-refresh enabled - refreshing every 30 seconds');
      autoRefreshInterval.current = setInterval(() => {
        console.log('🔄 Auto-refreshing orders...');
        fetchData();
      }, 30000); // Refresh every 30 seconds
    } else {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    }

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [autoRefreshEnabled]);

  useEffect(() => {
    if (!user || user.role !== 'delivery_partner') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (locationError) {
      // Only show error toast if it's a permission error
      if (locationError.toLowerCase().includes('permission denied')) {
        toast.error(locationError, { duration: 6000, id: 'location-error' });
      }
      // Silent for other errors - they're already logged in the hook
    }
  }, [locationError]);

  const fetchData = async () => {
    const wasLoading = loading;
    if (!wasLoading) setLoading(true);
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
      console.error('Fetch error:', error);
      if (!wasLoading) {
        toast.error('Failed to refresh data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = useCallback(async (orderId) => {
    setActionLoading(orderId);
    try {
      const response = await acceptOrder(orderId);
      toast.success('Order accepted successfully! 🎉');
      
      // Refresh data to get fully populated order
      await fetchData();
      
      // Switch to assigned tab
      setActiveTab('assigned');
      
      // If response has the order, show it in modal
      if (response.data?.order) {
        setSelectedOrder(response.data.order);
        setShowOrderDetail(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handlePickupOrder = async (orderId) => {
    setActionLoading(orderId);
    try {
      await updateOrderStatus(orderId, 'out_for_delivery');
      toast.success('Order picked up! On the way to customer 🚴');
      fetchData();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'out_for_delivery' }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    if (!deliveryOtp || deliveryOtp.length !== 4) {
      toast.error('Please enter the 4-digit OTP from customer');
      return;
    }

    setActionLoading(orderId);
    try {
      await markAsDelivered(orderId, deliveryOtp);
      toast.success('Order delivered successfully! ✅');
      setDeliveryOtp('');
      setShowOrderDetail(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP or failed to mark as delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const getDistanceBetween = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    return calculateDistance(lat1, lon1, lat2, lon2);
  };

  const openGoogleMaps = (lat, lng, label) => {
    if (!lat || !lng) {
      toast.error('Location not available');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const getOrderTimeline = (order) => {
    const timeline = [
      { status: 'confirmed', label: 'Confirmed', completed: true },
      { status: 'preparing', label: 'Preparing', completed: ['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.status) },
      { status: 'ready', label: 'Ready', completed: ['ready', 'out_for_delivery', 'delivered'].includes(order.status) },
      { status: 'out_for_delivery', label: 'Out for Delivery', completed: ['out_for_delivery', 'delivered'].includes(order.status) },
      { status: 'delivered', label: 'Delivered', completed: order.status === 'delivered' }
    ];
    return timeline;
  };

  // Memoize the modal component to prevent unnecessary re-renders
  const OrderDetailModal = React.memo(({ order, onClose }) => {
    if (!order) {
      console.warn('⚠️ Order detail modal opened with no order');
      return null;
    }

    console.log('📋 Order details modal opened:', {
      orderId: order._id,
      hasRestaurant: !!order.restaurantId,
      hasAddress: !!order.addressId,
      hasUser: !!order.userId,
      itemsCount: order.items?.length
    });

    const restaurantLat = order.restaurantId?.location?.coordinates?.[1];
    const restaurantLng = order.restaurantId?.location?.coordinates?.[0];
    const customerLat = order.addressId?.location?.coordinates?.[1];
    const customerLng = order.addressId?.location?.coordinates?.[0];

    const distanceToRestaurant = currentLocation && restaurantLat && restaurantLng
      ? getDistanceBetween(currentLocation.latitude, currentLocation.longitude, restaurantLat, restaurantLng)
      : null;

    const distanceToCustomer = currentLocation && customerLat && customerLng
      ? getDistanceBetween(currentLocation.latitude, currentLocation.longitude, customerLat, customerLng)
      : null;

    const timeline = getOrderTimeline(order);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-2 sm:my-4">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6 rounded-t-xl z-10">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate">Order #{order._id.slice(-8)}</h2>
                <p className="text-orange-100 text-xs sm:text-sm">{formatDateTime(order.createdAt)}</p>
              </div>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 flex-shrink-0">
                <XMarkIcon className="h-5 w-6 sm:h-6" />
              </button>
            </div>

            {/* Order Timeline */}
            <div className="mt-4 sm:mt-6 overflow-x-auto">
              <div className="flex justify-between items-center min-w-[500px] sm:min-w-0">
                {timeline.map((step, index) => (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                        step.completed ? 'bg-white text-orange-600' : 'bg-orange-300 text-orange-600'
                      }`}>
                        {step.completed ? '✓' : index + 1}
                      </div>
                      <span className="text-[10px] sm:text-xs mt-1 text-center whitespace-nowrap px-1">{step.label}</span>
                    </div>
                    {index < timeline.length - 1 && (
                      <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${
                        step.completed ? 'bg-white' : 'bg-orange-300'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Pickup Location */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border-2 border-blue-200">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-3">
                <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center">
                  <span className="mr-2">🏪</span> Pickup From
                </h3>
                <button
                  onClick={() => openGoogleMaps(restaurantLat, restaurantLng, order.restaurantId?.name)}
                  className="bg-blue-600 text-white px-3 py-1.5 sm:py-1 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 flex items-center gap-1 w-full sm:w-auto justify-center"
                >
                  <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  Navigate
                </button>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">{order.restaurantId?.name || 'Restaurant details not available'}</p>
              <p className="text-xs sm:text-sm text-gray-700 mt-1">
                {order.restaurantId?.address?.street || 'Address not available'}<br />
                {order.restaurantId?.address?.city && order.restaurantId?.address?.state
                  ? `${order.restaurantId.address.city}, ${order.restaurantId.address.state}`
                  : 'Location details not available'}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 pt-3 border-t border-blue-200">
                <a href={`tel:${order.restaurantId?.phone}`} className="flex items-center gap-1 text-blue-600 font-medium text-xs sm:text-sm">
                  <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  {order.restaurantId?.phone}
                </a>
                {distanceToRestaurant && (
                  <span className="text-xs sm:text-sm text-gray-600">
                    📍 {distanceToRestaurant.toFixed(1)} km away
                  </span>
                )}
              </div>
            </div>

            {/* Delivery Location */}
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 border-2 border-green-200">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-3">
                <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center">
                  <span className="mr-2">📍</span> Deliver To
                </h3>
                <button
                  onClick={() => openGoogleMaps(customerLat, customerLng, order.userId?.name)}
                  className="bg-green-600 text-white px-3 py-1.5 sm:py-1 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 flex items-center gap-1 w-full sm:w-auto justify-center"
                >
                  <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  Navigate
                </button>
              </div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">{order.userId?.name || 'Customer name not available'}</p>
              <p className="text-xs sm:text-sm text-gray-700 mt-1">
                {order.addressId?.street || 'Address not available'}
                {order.addressId?.landmark && `, ${order.addressId.landmark}`}<br />
                {order.addressId?.city && order.addressId?.state && order.addressId?.zipCode
                  ? `${order.addressId.city}, ${order.addressId.state} - ${order.addressId.zipCode}`
                  : 'Location details not available'}
              </p>
              {order.deliveryInstructions && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>Instructions:</strong> {order.deliveryInstructions}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 pt-3 border-t border-green-200">
                <a href={`tel:${order.userId?.phone}`} className="flex items-center gap-1 text-green-600 font-medium text-xs sm:text-sm">
                  <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  {order.userId?.phone}
                </a>
                {distanceToCustomer && (
                  <span className="text-xs sm:text-sm text-gray-600">
                    📍 {distanceToCustomer.toFixed(1)} km away
                  </span>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm sm:text-base">
                <span className="mr-2">📦</span> Order Items ({order.items?.length})
              </h3>
              <div className="space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start bg-white p-2 sm:p-3 rounded border">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {item.name}
                        {item.selectedVariant && <span className="text-gray-600"> ({item.selectedVariant})</span>}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base flex-shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Payment Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium text-green-600">{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(order.tax)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-300 flex justify-between">
                  <span className="font-bold text-gray-900 text-sm sm:text-base">Total</span>
                  <span className="font-bold text-gray-900 text-base sm:text-lg">{formatCurrency(order.total)}</span>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Payment Method</span>
                    <span className="font-semibold text-gray-900 uppercase text-xs sm:text-sm">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs sm:text-sm text-gray-600">Payment Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                  {order.paymentMethod === 'cod' && order.paymentStatus === 'pending' && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Collect <strong>{formatCurrency(order.total)}</strong> in cash from customer
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Your Earning */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm">Your Earning from this order</p>
                  <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(order.deliveryFee)}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {order.status === 'ready' && (
                <button
                  onClick={() => handlePickupOrder(order._id)}
                  disabled={actionLoading === order._id}
                  className="w-full bg-blue-600 text-white py-3 sm:py-4 px-4 rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <TruckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  {actionLoading === order._id ? 'Updating...' : 'Picked Up - On the Way'}
                </button>
              )}

              {order.status === 'out_for_delivery' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Enter 4-Digit Delivery OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="4"
                      value={deliveryOtp}
                      onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ask the customer for their delivery OTP</p>
                  </div>
                  <button
                    onClick={() => handleMarkDelivered(order._id)}
                    disabled={actionLoading === order._id || !deliveryOtp || deliveryOtp.length !== 4}
                    className="w-full bg-green-600 text-white py-3 sm:py-4 px-4 rounded-lg font-semibold text-sm sm:text-base hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    {actionLoading === order._id ? 'Verifying...' : 'Mark as Delivered'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Memoize OrderCard to prevent re-renders
  const OrderCard = React.memo(({ order, isAssigned }) => {
    const restaurantLat = order.restaurantId?.location?.coordinates?.[1];
    const restaurantLng = order.restaurantId?.location?.coordinates?.[0];
    const customerLat = order.addressId?.location?.coordinates?.[1];
    const customerLng = order.addressId?.location?.coordinates?.[0];

    // Memoize distance calculations
    const distance = useMemo(() => {
      if (!restaurantLat || !restaurantLng || !customerLat || !customerLng) return null;
      return getDistanceBetween(restaurantLat, restaurantLng, customerLat, customerLng);
    }, [restaurantLat, restaurantLng, customerLat, customerLng]);

    const distanceFromMe = useMemo(() => {
      if (!currentLocation || !restaurantLat || !restaurantLng) return null;
      return getDistanceBetween(currentLocation.latitude, currentLocation.longitude, restaurantLat, restaurantLng);
    }, [currentLocation, restaurantLat, restaurantLng]);

    const handleCardClick = useCallback(() => {
      setSelectedOrder(order);
      setShowOrderDetail(true);
    }, [order]);

    return (
      <div 
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer border-2 border-transparent hover:border-orange-500"
        onClick={handleCardClick}
      >
        {/* Header Bar */}
        <div className={`px-4 py-3 ${
          order.status === 'ready' ? 'bg-blue-500' :
          order.status === 'confirmed' ? 'bg-yellow-500' :
          order.status === 'out_for_delivery' ? 'bg-orange-500' :
          'bg-gray-500'
        }`}>
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">#{order._id.slice(-6)}</span>
              {distance && (
                <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                  📍 {distance.toFixed(1)} km
                </span>
              )}
            </div>
            <div className="text-sm font-medium">
              {new Date(order.createdAt).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Restaurant Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🏪</span>
                  <h4 className="font-bold text-gray-900">{order.restaurantId?.name}</h4>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  {order.restaurantId?.address?.street}, {order.restaurantId?.address?.city}
                </p>
              </div>
              {distanceFromMe && (
                <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {distanceFromMe.toFixed(1)} km
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-start gap-2">
              <span className="text-xl">📍</span>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-1">{order.userId?.name}</h4>
                <p className="text-sm text-gray-600">
                  {order.addressId?.street}, {order.addressId?.city}
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500">Items</div>
                <div className="font-bold text-gray-900">{order.items?.length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-bold text-gray-900">{formatCurrency(order.total)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Payment</div>
                <div className="font-semibold text-xs text-gray-900 uppercase">{order.paymentMethod}</div>
              </div>
            </div>
          </div>

          {/* Earning Badge */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Your Earning</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(order.deliveryFee)}</span>
            </div>
          </div>

          {/* Action Button */}
          {!isAssigned ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptOrder(order._id);
              }}
              disabled={actionLoading === order._id}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 shadow-md"
            >
              {actionLoading === order._id ? 'Accepting...' : '✅ Accept Order'}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(order);
                setShowOrderDetail(true);
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 transition shadow-md"
            >
              View Details →
            </button>
          )}
        </div>
      </div>
    );
  });

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
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-6 md:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div className="w-full lg:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Delivery Partner Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user?.name}! 🚴</p>
            </div>
            
            {/* Controls */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
              {/* Auto-Refresh Toggle */}
              <div className="bg-white rounded-lg shadow p-4 flex-1 sm:flex-none">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowPathIcon className={`h-5 w-5 ${autoRefreshEnabled ? 'text-green-600 animate-spin' : 'text-gray-400'}`} />
                    <span className="text-sm font-semibold text-gray-700">Auto-Refresh</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefreshEnabled}
                      onChange={(e) => {
                        setAutoRefreshEnabled(e.target.checked);
                        toast.success(e.target.checked ? '✅ Auto-refresh enabled' : '⏸️ Auto-refresh disabled');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
                {autoRefreshEnabled && (
                  <p className="text-xs text-gray-500 mt-1">Updates every 30s</p>
                )}
              </div>

              {/* Location Tracking Status */}
              <div className="bg-white rounded-lg shadow p-4 flex-1 sm:flex-none sm:min-w-[200px]">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-700">GPS Tracking</span>
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
                        Active
                      </span>
                    </>
                  ) : locationTrackingEnabled ? (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-yellow-600 font-medium">
                        Ready
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs text-gray-600 font-medium">
                        Off
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Deliveries</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalDeliveries || 0}</p>
              </div>
              <div className="bg-blue-100 p-2 sm:p-4 rounded-full flex-shrink-0 ml-2">
                <span className="text-xl sm:text-3xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Today's Deliveries</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.todayDeliveries || 0}</p>
              </div>
              <div className="bg-green-100 p-2 sm:p-4 rounded-full flex-shrink-0 ml-2">
                <span className="text-xl sm:text-3xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Active Orders</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.activeOrders || 0}</p>
              </div>
              <div className="bg-orange-100 p-2 sm:p-4 rounded-full flex-shrink-0 ml-2">
                <span className="text-xl sm:text-3xl">🚴</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Earnings</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalEarnings || 0)}
                </p>
              </div>
              <div className="bg-green-100 p-2 sm:p-4 rounded-full flex-shrink-0 ml-2">
                <span className="text-xl sm:text-3xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
                activeTab === 'available'
                  ? 'border-b-4 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">Available Orders</span>
              <span className="sm:hidden">Available</span>
              <span className="ml-1">({availableOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base transition-colors ${
                activeTab === 'assigned'
                  ? 'border-b-4 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">My Orders</span>
              <span className="sm:hidden">My Orders</span>
              <span className="ml-1">({assignedOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {activeTab === 'available' ? (
            availableOrders.length > 0 ? (
              availableOrders.map((order) => (
                <OrderCard key={order._id} order={order} isAssigned={false} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-600 text-lg">No orders available at the moment</p>
                <p className="text-gray-500 text-sm mt-2">New orders will appear here automatically</p>
              </div>
            )
          ) : (
            assignedOrders.length > 0 ? (
              assignedOrders.map((order) => (
                <OrderCard key={order._id} order={order} isAssigned={true} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-600 text-lg">No assigned orders</p>
                <p className="text-gray-500 text-sm mt-2">Accept orders from the Available tab</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => {
            setShowOrderDetail(false);
            setDeliveryOtp('');
          }} 
        />
      )}
    </div>
  );
};

export default DeliveryPartnerDashboard;
