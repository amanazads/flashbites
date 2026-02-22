import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  TruckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { getRestaurants } from '../api/restaurantApi';
import { getAllPartnerApplications, approvePartner, rejectPartner } from '../api/partnerApi';
import { getComprehensiveAnalytics } from '../api/adminApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/constants';
import axios from '../api/axios';
import socketService from '../services/socketService';

const AdminPanel = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    totalPartners: 0,
    pendingPartners: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/');
      return;
    }
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
      console.log('Admin panel auto-refreshed');
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, navigate]);

  // Socket.IO listener for new orders (admin receives all new orders)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    const handleNewOrder = (data) => {
      console.log('🔄 Admin: Auto-refreshing data on order event:', data.type);
      
      // Refresh data silently, global useNotifications handles UI
      if (activeTab === 'orders') {
        fetchData();
      }
    };

    socketService.onNewOrder(handleNewOrder);

    return () => {
      socketService.off('new-order');
    };
  }, [user, activeTab]);

  // Recalculate stats when data changes
  useEffect(() => {
    const pendingApprovals = restaurants.filter(r => !r.isApproved).length;
    const pendingPartners = partners.filter(p => p.status === 'pending').length;
    setStats({
      totalRestaurants: restaurants.length,
      totalUsers: users.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      pendingApprovals,
      totalPartners: partners.length,
      pendingPartners,
    });
  }, [restaurants, users, orders, partners]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch restaurants from admin endpoint
      try {
        const restaurantsRes = await axios.get('/admin/restaurants');
        const restaurantsList = restaurantsRes.data?.data?.restaurants || restaurantsRes.data?.restaurants || [];
        console.log('Admin restaurants loaded:', restaurantsList.length);
        setRestaurants(restaurantsList);
      } catch (err) {
        console.error('Failed to load restaurants:', err);
        toast.error('Failed to load restaurants');
      }
      
      // Fetch users
      try {
        const usersRes = await axios.get('/admin/users');
        setUsers(usersRes.data?.data?.users || []);
      } catch (err) {
        console.log('Users endpoint not available yet');
      }
      
      // Fetch orders
      try {
        const ordersRes = await axios.get('/admin/orders');
        setOrders(ordersRes.data?.data?.orders || []);
      } catch (err) {
        console.log('Orders endpoint not available yet');
      }
      
      // Fetch partners
      try {
        const partnersRes = await getAllPartnerApplications();
        setPartners(partnersRes.data?.partners || []);
      } catch (err) {
        console.log('Partners endpoint not available yet');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const fetchAnalytics = async (period = analyticsPeriod) => {
    setAnalyticsLoading(true);
    try {
      const response = await getComprehensiveAnalytics({ period });
      setAnalytics(response.data.data);
      console.log('Analytics loaded:', response.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleApproveRestaurant = async (restaurantId) => {
    try {
      await axios.patch(`/admin/restaurants/${restaurantId}/approve`, {
        isApproved: true
      });
      toast.success('Restaurant approved');
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error('Failed to approve restaurant');
      console.error(error);
    }
  };

  const handleRejectRestaurant = async (restaurantId) => {
    if (!window.confirm('Are you sure you want to reject this restaurant?')) return;
    
    try {
      await axios.patch(`/admin/restaurants/${restaurantId}/approve`, {
        isApproved: false
      });
      toast.success('Restaurant rejected');
      fetchData(); // Auto-refresh
    } catch (error) {
      toast.error('Failed to reject restaurant');
      console.error(error);
    }
  };

  const handleApprovePartner = async (partnerId) => {
    try {
      await approvePartner(partnerId);
      toast.success('Partner application approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve partner');
      console.error(error);
    }
  };

  const handleRejectPartner = async (partnerId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await rejectPartner(partnerId, reason);
      toast.success('Partner application rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject partner');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto container-px">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="mt-2 text-gray-600">
              Manage restaurants, users, and platform settings • Auto-refreshes every 30s
            </p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Refresh Now
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingStorefrontIcon className="h-8 w-8 text-primary-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Restaurants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRestaurants}</p>
                {stats.pendingApprovals > 0 && (
                  <p className="text-xs text-primary-600">{stats.pendingApprovals} pending approval</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('restaurants')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'restaurants'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Restaurants ({restaurants.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'users'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'orders'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('partners')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'partners'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Partners ({partners.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('analytics');
                  fetchAnalytics();
                }}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Platform Overview</h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Welcome to the admin panel. Monitor and manage all aspects of the FlashBites platform.
                  </p>
                  {stats.pendingApprovals > 0 && (
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                      <p className="text-primary-800 font-medium">
                        ⚠️ {stats.pendingApprovals} restaurant(s) awaiting approval
                      </p>
                      <button
                        onClick={() => setActiveTab('restaurants')}
                        className="mt-2 text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Review Now →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'restaurants' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Restaurant Management</h2>
                  <div className="text-sm text-gray-600">
                    Total: {restaurants.length} | 
                    <span className="text-yellow-600 ml-1">
                      Pending: {restaurants.filter(r => !r.isApproved).length}
                    </span>
                  </div>
                </div>
                {restaurants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No restaurants registered yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {restaurants.map((restaurant) => (
                          <tr key={restaurant._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {restaurant.image && (
                                  <img
                                    src={restaurant.image}
                                    alt={restaurant.name}
                                    className="h-10 w-10 rounded-full object-cover mr-3"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                                  <div className="text-sm text-gray-500">{restaurant.cuisines?.join(', ')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{restaurant.ownerId?.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{restaurant.ownerId?.email || restaurant.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {restaurant.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                restaurant.isApproved
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {restaurant.isApproved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {!restaurant.isApproved ? (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleApproveRestaurant(restaurant._id)}
                                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectRestaurant(restaurant._id)}
                                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                    title="Reject"
                                  >
                                    <XCircleIcon className="h-4 w-4 mr-1" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-5 w-5 mr-1" />
                                  <span>Approved</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold mb-4">User Management</h2>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    User management endpoint not yet implemented
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Order Management</h2>
                  <button
                    onClick={fetchData}
                    className="btn-outline text-sm flex items-center"
                    disabled={loading}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No orders to display yet</p>
                    <p className="text-gray-400 text-sm mt-2">Orders will appear here once customers start ordering</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="border rounded-lg p-6 hover:shadow-lg transition bg-white">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg">
                                Order #{order._id?.slice(-8).toUpperCase()}
                              </h3>
                              <span className={`badge ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                {ORDER_STATUS_LABELS[order.status] || order.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Restaurant: <span className="font-medium">{order.restaurantId?.name || 'N/A'}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Customer: <span className="font-medium">{order.userId?.name || 'N/A'}</span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary-600">
                              {formatCurrency(order.total || order.totalAmount || 0)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 capitalize">
                              {order.paymentMethod || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {order.items && order.items.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-3 mt-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Order Items:</p>
                            <div className="space-y-1">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <p key={idx} className="text-sm text-gray-700">
                                  {item.quantity}x {item.name}
                                </p>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{order.items.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'partners' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Delivery Partner Applications</h2>
                  <div className="text-sm text-gray-600">
                    Total: {partners.length} | 
                    <span className="text-yellow-600 ml-1">
                      Pending: {partners.filter(p => p.status === 'pending').length}
                    </span>
                  </div>
                </div>
                {partners.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No partner applications yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partners.map((partner) => (
                      <div key={partner._id} className="border rounded-lg p-6 bg-white hover:shadow-lg transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {partner.documents?.photo?.url && (
                                <img
                                  src={partner.documents.photo.url}
                                  alt={partner.fullName}
                                  className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">{partner.fullName}</h3>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  partner.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  partner.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600"><span className="font-medium">Email:</span> {partner.email}</p>
                                <p className="text-gray-600"><span className="font-medium">Phone:</span> {partner.phone}</p>
                                <p className="text-gray-600"><span className="font-medium">Alternate:</span> {partner.alternatePhone}</p>
                              </div>
                              <div>
                                <p className="text-gray-600"><span className="font-medium">Vehicle:</span> {partner.vehicleType.toUpperCase()} - {partner.vehicleNumber}</p>
                                <p className="text-gray-600"><span className="font-medium">Model:</span> {partner.vehicleModel}</p>
                                <p className="text-gray-600"><span className="font-medium">License:</span> {partner.licenseNumber}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-gray-600">
                                  <span className="font-medium">Address:</span> {partner.address.street}, {partner.address.city}, {partner.address.state} - {partner.address.zipCode}
                                </p>
                              </div>
                            </div>

                            {partner.rejectionReason && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-800">
                                  <span className="font-medium">Rejection Reason:</span> {partner.rejectionReason}
                                </p>
                              </div>
                            )}

                            <div className="mt-3 flex gap-2">
                              {partner.documents?.drivingLicense?.url && (
                                <a
                                  href={partner.documents.drivingLicense.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                  View License
                                </a>
                              )}
                              {partner.documents?.aadharCard?.url && (
                                <a
                                  href={partner.documents.aadharCard.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                  View Aadhar
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="ml-4">
                            {partner.status === 'pending' && (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleApprovePartner(partner._id)}
                                  className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors whitespace-nowrap"
                                >
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPartner(partner._id)}
                                  className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors whitespace-nowrap"
                                >
                                  <XCircleIcon className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Applied: {formatDateTime(partner.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                {/* Period Selector */}
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-xl font-bold">Business Analytics</h2>
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => {
                      setAnalyticsPeriod(e.target.value);
                      fetchAnalytics(e.target.value);
                    }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                {analyticsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <ShoppingBagIcon className="h-10 w-10 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm text-blue-800">Total Orders</p>
                            <p className="text-3xl font-bold text-blue-900">{analytics.overview.totalOrders}</p>
                            <p className="text-xs text-blue-600 mt-1">{analytics.overview.deliveredOrders} delivered</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-10 w-10 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm text-green-800">Total Revenue</p>
                            <p className="text-3xl font-bold text-green-900">{formatCurrency(analytics.overview.totalRevenue)}</p>
                            <p className="text-xs text-green-600 mt-1">Avg: {formatCurrency(analytics.overview.avgOrderValue)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <BuildingStorefrontIcon className="h-10 w-10 text-purple-600" />
                          <div className="ml-4">
                            <p className="text-sm text-purple-800">Restaurants</p>
                            <p className="text-3xl font-bold text-purple-900">{analytics.overview.activeRestaurants}</p>
                            <p className="text-xs text-purple-600 mt-1">{analytics.overview.pendingRestaurants} pending</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <TruckIcon className="h-10 w-10 text-primary-600" />
                          <div className="ml-4">
                            <p className="text-sm text-primary-800">Delivery Partners</p>
                            <p className="text-3xl font-bold text-primary-900">{analytics.overview.totalDeliveryPartners}</p>
                            <p className="text-xs text-primary-600 mt-1">Active fleet</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Payment Methods</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-green-900">💳 Online Payments</span>
                              <span className="text-sm text-green-600">{analytics.paymentBreakdown.online.percentage}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-700">{analytics.paymentBreakdown.online.count} orders</span>
                              <span className="text-lg font-bold text-green-900">{formatCurrency(analytics.paymentBreakdown.online.amount)}</span>
                            </div>
                          </div>

                          <div className="p-4 bg-primary-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-primary-900">💵 Cash on Delivery</span>
                              <span className="text-sm text-primary-600">{analytics.paymentBreakdown.cash.percentage}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-primary-700">{analytics.paymentBreakdown.cash.count} orders</span>
                              <span className="text-lg font-bold text-primary-900">{formatCurrency(analytics.paymentBreakdown.cash.amount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Restaurant Status</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">Total Restaurants</span>
                            <span className="text-2xl font-bold">{analytics.restaurantStatus.total}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium text-green-700">🟢 Active</span>
                            <span className="text-xl font-bold text-green-900">{analytics.restaurantStatus.active}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">⚫ Inactive</span>
                            <span className="text-xl font-bold text-gray-900">{analytics.restaurantStatus.inactive}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                            <span className="font-medium text-primary-700">⏳ Pending Approval</span>
                            <span className="text-xl font-bold text-primary-900">{analytics.restaurantStatus.pending}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Restaurants */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Top Performing Restaurants</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {analytics.ordersByRestaurant.slice(0, 10).map((restaurant, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{restaurant.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${restaurant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {restaurant.isActive ? '🟢 Active' : '⚫ Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{restaurant.totalOrders}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                  {formatCurrency(restaurant.totalRevenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(restaurant.avgOrderValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Delivery Partners Performance */}
                    {analytics.deliveryPartnerStats && analytics.deliveryPartnerStats.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Top Delivery Partners</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {analytics.deliveryPartnerStats.slice(0, 6).map((partner, index) => (
                            <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                                <TruckIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{partner.phone}</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Total Deliveries:</span>
                                <span className="font-semibold">{partner.totalDeliveries}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Completed:</span>
                                <span className="font-semibold text-green-600">{partner.completedDeliveries}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cash Collection Details */}
                    {analytics.cashOrders && analytics.cashOrders.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-4">Recent Cash Collections (COD)</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Partner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {analytics.cashOrders.slice(0, 20).map((order, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.orderNumber}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.restaurant}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div>
                                      <p className="font-medium">{order.deliveryPartner}</p>
                                      <p className="text-xs text-gray-500">{order.deliveryPartnerPhone}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-600">
                                    {formatCurrency(order.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Daily Revenue Trend */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Daily Revenue Trend</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {analytics.dailyRevenue.map((day, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {new Date(day.date).toLocaleDateString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.orderCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                  {formatCurrency(day.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No analytics data available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
