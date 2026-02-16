import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  createRestaurant, 
  getMyRestaurant, 
  updateRestaurant,
  deleteRestaurant,
  getRestaurantMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getRestaurantAnalytics 
} from '../api/restaurantApi';
import { getRestaurantOrders, updateOrderStatus } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/constants';
import socketService from '../services/socketService';
import { playNotificationSound } from '../utils/notificationSound';

const RestaurantDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [autoRefreshOrders, setAutoRefreshOrders] = useState(false);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [restaurantImageFile, setRestaurantImageFile] = useState(null);
  const [restaurantImagePreview, setRestaurantImagePreview] = useState(null);
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [restaurantData, setRestaurantData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    cuisines: [],
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    location: {
      type: 'Point',
      coordinates: [0, 0],
    },
    timing: {
      open: '09:00',
      close: '22:00',
    },
    deliveryTime: '30-40 min',
  });

  const [menuItemData, setMenuItemData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    isVeg: true,
    isAvailable: true,
  });

  useEffect(() => {
    // Wait for user data to load
    if (user === null) {
      // Still loading user data
      return;
    }

    setAuthChecked(true);

    if (user?.role !== 'restaurant_owner') {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    fetchRestaurantData();
  }, [user, navigate]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const response = await getMyRestaurant();
      
      if (response.data.restaurant) {
        setRestaurant(response.data.restaurant);
        await fetchMenuItems(response.data.restaurant._id);
        
        // Join restaurant room for real-time notifications
        socketService.joinRestaurant(response.data.restaurant._id);
        console.log('🏪 Joined restaurant room:', response.data.restaurant._id);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No restaurant found, show create form
        setShowRestaurantForm(true);
      } else {
        toast.error('Failed to load restaurant data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO event listeners for real-time notifications
  useEffect(() => {
    if (!restaurant) return;

    // Listen for new orders
    const handleNewOrder = (data) => {
      console.log('🔔 New order received:', data);
      
      // Play notification sound
      playNotificationSound('new-order');
      
      // Show toast notification
      if (data.type === 'NEW_ORDER') {
        toast.success(`🔔 New Order! Total: ${formatCurrency(data.order.total)}`, {
          duration: 5000,
          icon: '🛎️'
        });
      } else if (data.type === 'ORDER_CANCELLED') {
        toast.error(data.message || 'Order was cancelled', {
          duration: 5000
        });
      } else if (data.type === 'ORDER_STATUS_UPDATE') {
        toast.info(data.message || 'Order status updated', {
          duration: 4000
        });
      }
      
      // Refresh orders list
      if (activeTab === 'orders') {
        fetchOrders();
      }
    };

    socketService.onNewOrder(handleNewOrder);

    // Cleanup
    return () => {
      socketService.off('new-order');
    };
  }, [restaurant, activeTab]);

  // Auto-refresh orders when enabled
  useEffect(() => {
    if (!autoRefreshOrders || activeTab !== 'orders' || !restaurant) return;

    const intervalId = setInterval(() => {
      console.log('Auto-refreshing orders...');
      fetchOrders();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [autoRefreshOrders, activeTab, restaurant]);

  const fetchMenuItems = async (restaurantId) => {
    try {
      console.log('Fetching menu items for restaurant:', restaurantId);
      const response = await getRestaurantMenuItems(restaurantId);
      console.log('Menu items response:', response);
      const items = response.data?.items || response.items || [];
      console.log('Setting menu items:', items.length, 'items');
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      toast.error('Failed to load menu items');
    }
  };

  const handleRestaurantSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      
      // Append all restaurant data
      formData.append('name', restaurantData.name);
      formData.append('email', restaurantData.email);
      formData.append('phone', restaurantData.phone);
      formData.append('description', restaurantData.description);
      formData.append('cuisines', JSON.stringify(restaurantData.cuisines));
      formData.append('address', JSON.stringify(restaurantData.address));
      formData.append('location', JSON.stringify(restaurantData.location));
      formData.append('timing', JSON.stringify(restaurantData.timing));
      formData.append('deliveryTime', restaurantData.deliveryTime);
      
      // Append image if selected
      if (restaurantImageFile) {
        formData.append('image', restaurantImageFile);
      }

      if (restaurant) {
        await updateRestaurant(restaurant._id, formData);
        toast.success('Restaurant updated successfully');
      } else {
        await createRestaurant(formData);
        toast.success('Restaurant created! Pending admin approval');
      }
      
      setShowRestaurantForm(false);
      setRestaurantImageFile(null);
      setRestaurantImagePreview(null);
      fetchRestaurantData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save restaurant');
    }
  };

  const handleMenuItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      
      // Append menu item data
      formData.append('name', menuItemData.name);
      formData.append('description', menuItemData.description);
      formData.append('price', menuItemData.price);
      formData.append('category', menuItemData.category);
      formData.append('isVeg', menuItemData.isVeg);
      formData.append('isAvailable', menuItemData.isAvailable);
      
      // Append image if selected
      if (menuImageFile) {
        formData.append('image', menuImageFile);
      }

      if (editingItem) {
        await updateMenuItem(restaurant._id, editingItem._id, formData);
        toast.success('Menu item updated');
      } else {
        await createMenuItem(restaurant._id, formData);
        toast.success('Menu item added');
      }

      // Close form and reset
      setShowMenuForm(false);
      setEditingItem(null);
      setMenuImageFile(null);
      setMenuImagePreview(null);
      setMenuItemData({
        name: '',
        description: '',
        price: '',
        category: '',
        isVeg: true,
        isAvailable: true,
      });
      
      // Immediately refresh menu items
      await fetchMenuItems(restaurant._id);
      console.log('Menu items refreshed after add/update');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save menu item');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteMenuItem(restaurant._id, itemId);
      toast.success('Menu item deleted');
      // Immediately refresh menu items
      await fetchMenuItems(restaurant._id);
    } catch (error) {
      toast.error('Failed to delete menu item');
      console.error('Delete error:', error);
    }
  };

  const handleDeleteRestaurant = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your restaurant? This action cannot be undone and will delete all menu items and order history.'
    );
    
    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Type "DELETE" to confirm deletion:'
    );

    if (doubleConfirm !== 'DELETE') {
      toast.error('Deletion cancelled');
      return;
    }

    try {
      await deleteRestaurant(restaurant._id);
      toast.success('Restaurant deleted successfully');
      // Refresh to show registration form
      setRestaurant(null);
      setMenuItems([]);
      setOrders([]);
      setShowRestaurantForm(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete restaurant');
      console.error('Delete restaurant error:', error);
    }
  };

  const fetchOrders = async () => {
    if (!restaurant?._id) return;
    
    setOrdersLoading(true);
    try {
      const response = await getRestaurantOrders(restaurant._id);
      setOrders(response.data.orders || []);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error('Orders fetch error:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchAnalytics = async (period = analyticsPeriod) => {
    if (!restaurant?._id) return;
    
    setAnalyticsLoading(true);
    try {
      const response = await getRestaurantAnalytics(restaurant._id, { period });
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error('Analytics fetch error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated');
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleEditMenuItem = (item) => {
    setEditingItem(item);
    setMenuItemData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
    });
    setMenuImagePreview(item.image);
    setShowMenuForm(true);
  };

  const handleRestaurantImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setRestaurantImageFile(file);
      setRestaurantImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMenuImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setMenuImageFile(file);
      setMenuImagePreview(URL.createObjectURL(file));
    }
  };

  // Show loading while checking authentication
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!restaurant && !showRestaurantForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <BuildingStorefrontIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Restaurant Found
            </h2>
            <p className="text-gray-600 mb-6">
              Register your restaurant to start managing your menu and orders
            </p>
            <button
              onClick={() => setShowRestaurantForm(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2 inline" />
              Register Restaurant
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {restaurant?.image && (
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-orange-500 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {restaurant?.name || 'Restaurant Dashboard'}
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {restaurant?.isApproved ? (
                    <span className="text-green-600">✓ Approved</span>
                  ) : (
                    <span className="text-yellow-600">⏳ Pending Approval</span>
                  )}
                </p>
              </div>
            </div>
            {restaurant && (
              <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => {
                    setRestaurantData({
                      name: restaurant.name,
                      email: restaurant.email,
                      phone: restaurant.phone,
                      description: restaurant.description,
                      cuisines: restaurant.cuisines,
                      address: restaurant.address,
                      location: restaurant.location,
                      timing: restaurant.timing,
                      deliveryTime: restaurant.deliveryTime,
                    });
                    setRestaurantImagePreview(restaurant.image);
                    setRestaurantImageFile(null);
                    setShowRestaurantForm(true);
                  }}
                  className="btn-secondary text-sm sm:text-base flex-1 sm:flex-initial"
                >
                  <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 inline" />
                  <span className="hidden sm:inline">Edit Restaurant</span>
                  <span className="sm:hidden">Edit</span>
                </button>
                <button
                  onClick={handleDeleteRestaurant}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base flex-1 sm:flex-initial"
                >
                  <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 inline" />
                  <span className="hidden sm:inline">Delete Restaurant</span>
                  <span className="sm:hidden">Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {restaurant && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 flex-shrink-0" />
                <div className="ml-2 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Menu Items</p>
                  <p className="text-xl sm:text-2xl font-bold">{menuItems.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 flex-shrink-0" />
                <div className="ml-2 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Delivery Time</p>
                  <p className="text-base sm:text-2xl font-bold truncate">{restaurant.deliveryTime}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center">
                <BuildingStorefrontIcon className="h-8 w-8 sm:h-10 sm:w-10 text-purple-500 flex-shrink-0" />
                <div className="ml-2 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">Status</p>
                  <p className="text-base sm:text-lg font-bold truncate">
                    {restaurant.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {restaurant && (
          <>
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max sm:min-w-0">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'menu'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Menu Items
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('orders');
                      fetchOrders();
                    }}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'orders'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('analytics');
                      fetchAnalytics();
                    }}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'analytics'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Analytics
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                {/* Restaurant Status Toggle */}
                <div className="mb-6 p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${restaurant.acceptingOrders ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <h3 className="font-bold text-lg">
                          Restaurant Status: {restaurant.acceptingOrders ? 'OPEN' : 'CLOSED'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {restaurant.acceptingOrders 
                            ? 'You are accepting new orders' 
                            : 'You are not accepting new orders'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restaurant.acceptingOrders}
                        onChange={async (e) => {
                          const newStatus = e.target.checked;
                          try {
                            await updateRestaurant(restaurant._id, { acceptingOrders: newStatus });
                            setRestaurant({ ...restaurant, acceptingOrders: newStatus });
                            toast.success(`Restaurant ${newStatus ? 'opened' : 'closed'} successfully`);
                          } catch (error) {
                            toast.error('Failed to update restaurant status');
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {restaurant.acceptingOrders ? 'Open' : 'Closed'}
                      </span>
                    </label>
                  </div>
                </div>

                <h2 className="text-xl font-bold mb-4">Restaurant Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{restaurant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{restaurant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{restaurant.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cuisines</p>
                    <p className="font-medium">{restaurant.cuisines?.join(', ')}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium">{restaurant.description}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">
                      {restaurant.address.street}, {restaurant.address.city},{' '}
                      {restaurant.address.state} - {restaurant.address.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Opening Hours</p>
                    <p className="font-medium">
                      {restaurant.timing?.open || '09:00'} - {restaurant.timing?.close || '22:00'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div>
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Menu Items</h2>
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setMenuItemData({
                          name: '',
                          description: '',
                          price: '',
                          category: '',
                          isVeg: true,
                          isAvailable: true,
                        });
                        setMenuImageFile(null);
                        setMenuImagePreview(null);
                        setShowMenuForm(true);
                      }}
                      className="btn-primary"
                    >
                      <PlusIcon className="h-5 w-5 mr-2 inline" />
                      Add Menu Item
                    </button>
                  </div>

                  {menuItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No menu items yet. Add your first item!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menuItems.map((item) => (
                        <div
                          key={item._id}
                          className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                        >
                          {/* Menu Item Image */}
                          {item.image && (
                            <div className="relative h-40 w-full bg-gray-200">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded shadow-md font-medium ${
                                    item.isVeg
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-4">
                            {!item.image && (
                              <div className="flex justify-between items-start mb-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    item.isVeg
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-lg flex-1">{item.name}</h3>
                              <div className="flex space-x-2 ml-2">
                                <button
                                  onClick={() => handleEditMenuItem(item)}
                                  className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                                  title="Edit item"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item._id)}
                                  className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                                  title="Delete item"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {item.description || 'No description available'}
                            </p>
                            
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-xl text-orange-600">
                                ₹{item.price}
                              </span>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {item.category}
                              </span>
                            </div>
                            
                            <div className="mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  item.isAvailable
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {item.isAvailable ? '✓ Available' : '✗ Unavailable'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                  <h2 className="text-xl font-bold">Restaurant Orders</h2>
                  <div className="flex items-center gap-3">
                    {/* Auto-refresh toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRefreshOrders}
                        onChange={(e) => setAutoRefreshOrders(e.target.checked)}
                        className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">
                        Auto-refresh {autoRefreshOrders && '(30s)'}
                      </span>
                    </label>
                    <button
                      onClick={fetchOrders}
                      className="btn-outline"
                      disabled={ordersLoading}
                    >
                      {ordersLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No orders yet</p>
                    <p className="text-gray-400 text-sm mt-2">Orders will appear here once customers start ordering</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order._id}
                        className="border rounded-lg p-6 hover:shadow-lg transition"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg">
                                Order #{order._id.slice(-8).toUpperCase()}
                              </h3>
                              <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                                {ORDER_STATUS_LABELS[order.status]}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {formatDateTime(order.createdAt)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Customer: {order.userId?.name || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary-600">
                              {formatCurrency(order.total)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {order.items.length} item{order.items.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold mb-2 text-sm">Order Items:</h4>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Address */}
                        {(order.addressId || order.deliveryAddress) && (
                          <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold mb-2 text-sm">Delivery Address:</h4>
                            {order.addressId ? (
                              <p className="text-sm text-gray-700">
                                {order.addressId.street}, {order.addressId.city}, {order.addressId.state} - {order.addressId.zipCode}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-700">
                                {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
                              </p>
                            )}
                            {order.deliveryInstructions && (
                              <p className="text-sm text-gray-600 mt-2">
                                <span className="font-semibold">Note:</span> {order.deliveryInstructions}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Order Status Actions */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex gap-2 flex-wrap">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order._id, 'confirmed')}
                                  className="btn-primary text-sm px-4 py-2"
                                >
                                  <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                                  Confirm Order
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Reason for cancellation:');
                                    if (reason) {
                                      handleUpdateOrderStatus(order._id, 'cancelled');
                                    }
                                  }}
                                  className="btn-outline border-red-500 text-red-500 hover:bg-red-50 text-sm px-4 py-2"
                                >
                                  <XCircleIcon className="h-4 w-4 inline mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'preparing')}
                                className="btn-primary text-sm px-4 py-2"
                              >
                                Start Preparing
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'ready')}
                                className="btn-primary text-sm px-4 py-2"
                              >
                                Mark as Ready
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'out_for_delivery')}
                                className="btn-primary text-sm px-4 py-2"
                              >
                                Out for Delivery
                              </button>
                            )}
                            {order.status === 'out_for_delivery' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'delivered')}
                                className="btn-primary text-sm px-4 py-2"
                              >
                                Mark as Delivered
                              </button>
                            )}
                          </div>
                        )}

                        {order.status === 'delivered' && (
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <CheckCircleIcon className="h-6 w-6 text-green-500 inline mr-2" />
                            <span className="text-green-700 font-medium">
                              Delivered on {formatDateTime(order.deliveredAt)}
                            </span>
                          </div>
                        )}

                        {order.status === 'cancelled' && (
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <XCircleIcon className="h-6 w-6 text-red-500 inline mr-2" />
                            <span className="text-red-700 font-medium">Order Cancelled</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Period Selector */}
                <div className="bg-white rounded-lg shadow-md p-4">
                  <label className="block text-sm font-medium mb-2">Time Period</label>
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => {
                      setAnalyticsPeriod(e.target.value);
                      fetchAnalytics(e.target.value);
                    }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                {analyticsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                  </div>
                ) : analytics ? (
                  <>
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center">
                          <ShoppingBagIcon className="h-10 w-10 text-blue-500 flex-shrink-0" />
                          <div className="ml-4">
                            <p className="text-sm text-gray-600">Total Orders</p>
                            <p className="text-2xl font-bold">{analytics.overview.totalOrders}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-10 w-10 text-green-500 flex-shrink-0" />
                          <div className="ml-4">
                            <p className="text-sm text-gray-600">Delivered</p>
                            <p className="text-2xl font-bold">{analytics.overview.deliveredOrders}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-10 w-10 text-green-500 flex-shrink-0" />
                          <div className="ml-4">
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center">
                          <ChartBarIcon className="h-10 w-10 text-purple-500 flex-shrink-0" />
                          <div className="ml-4">
                            <p className="text-sm text-gray-600">Avg Order Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(analytics.overview.avgOrderValue)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Revenue Chart */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-bold mb-4">Day-wise Revenue</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order</th>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(day.avgOrderValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold mb-4">Payment Methods</h3>
                        <div className="space-y-3">
                          {analytics.paymentBreakdown.map((method, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium capitalize">{method._id === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                                <p className="text-sm text-gray-600">{method.count} orders</p>
                              </div>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(method.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold mb-4">Top Selling Items</h3>
                        <div className="space-y-3">
                          {analytics.topItems.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-sm text-gray-600">{item.totalSold} sold</p>
                              </div>
                              <p className="text-sm font-semibold text-green-600 ml-2">{formatCurrency(item.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Peak Hours */}
                    {analytics.hourlyDistribution && analytics.hourlyDistribution.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold mb-4">Order Distribution by Hour</h3>
                        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                          {Array.from({ length: 24 }, (_, hour) => {
                            const data = analytics.hourlyDistribution.find(h => h._id === hour);
                            const count = data?.orderCount || 0;
                            const maxCount = Math.max(...analytics.hourlyDistribution.map(h => h.orderCount));
                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            
                            return (
                              <div key={hour} className="flex flex-col items-center">
                                <div className="w-full bg-gray-200 rounded-t" style={{ height: '100px', display: 'flex', alignItems: 'flex-end' }}>
                                  <div
                                    className="w-full bg-orange-500 rounded-t transition-all"
                                    style={{ height: `${height}%` }}
                                    title={`${hour}:00 - ${count} orders`}
                                  />
                                </div>
                                <p className="text-xs mt-1 text-gray-600">{hour}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No analytics data available</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Restaurant Form Modal */}
        {showRestaurantForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 my-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                {restaurant ? 'Edit Restaurant' : 'Register Restaurant'}
              </h2>
              <form onSubmit={handleRestaurantSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantData.name}
                    onChange={(e) =>
                      setRestaurantData({ ...restaurantData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={restaurantData.email}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={restaurantData.phone}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={restaurantData.description}
                    onChange={(e) =>
                      setRestaurantData({
                        ...restaurantData,
                        description: e.target.value,
                      })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cuisines (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={restaurantData.cuisines.join(', ')}
                    onChange={(e) =>
                      setRestaurantData({
                        ...restaurantData,
                        cuisines: e.target.value.split(',').map((c) => c.trim()),
                      })
                    }
                    placeholder="e.g., Indian, Chinese, Italian"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Street</label>
                    <input
                      type="text"
                      value={restaurantData.address.street}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          address: {
                            ...restaurantData.address,
                            street: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={restaurantData.address.city}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          address: {
                            ...restaurantData.address,
                            city: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={restaurantData.address.state}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          address: {
                            ...restaurantData.address,
                            state: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={restaurantData.address.zipCode}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          address: {
                            ...restaurantData.address,
                            zipCode: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={restaurantData.timing.open}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          timing: {
                            ...restaurantData.timing,
                            open: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={restaurantData.timing.close}
                      onChange={(e) =>
                        setRestaurantData({
                          ...restaurantData,
                          timing: {
                            ...restaurantData.timing,
                            close: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    value={restaurantData.deliveryTime}
                    onChange={(e) =>
                      setRestaurantData({
                        ...restaurantData,
                        deliveryTime: e.target.value,
                      })
                    }
                    placeholder="e.g., 30-40 min"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Restaurant Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Restaurant Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRestaurantImageChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {restaurantImagePreview && (
                    <div className="mt-3">
                      <img
                        src={restaurantImagePreview}
                        alt="Restaurant Preview"
                        className="h-48 w-full object-cover rounded-lg shadow-md"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 1200x600px, Max 5MB
                  </p>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowRestaurantForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {restaurant ? 'Update' : 'Create'} Restaurant
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Menu Item Form Modal */}
        {showMenuForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 my-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <form onSubmit={handleMenuItemSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={menuItemData.name}
                    onChange={(e) =>
                      setMenuItemData({ ...menuItemData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Item Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMenuImageChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {menuImagePreview && (
                    <div className="mt-2">
                      <img
                        src={menuImagePreview}
                        alt="Preview"
                        className="h-32 w-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 800x600px, Max 5MB
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={menuItemData.description}
                    onChange={(e) =>
                      setMenuItemData({
                        ...menuItemData,
                        description: e.target.value,
                      })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={menuItemData.price}
                      onChange={(e) =>
                        setMenuItemData({ ...menuItemData, price: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={menuItemData.category}
                      onChange={(e) =>
                        setMenuItemData({
                          ...menuItemData,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select category</option>
                      <option value="Starters">Starters</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Breads">Breads</option>
                      <option value="Rice">Rice</option>
                      <option value="Snacks">Snacks</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={menuItemData.isVeg}
                      onChange={(e) =>
                        setMenuItemData({
                          ...menuItemData,
                          isVeg: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Vegetarian</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={menuItemData.isAvailable}
                      onChange={(e) =>
                        setMenuItemData({
                          ...menuItemData,
                          isAvailable: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Available</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuForm(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingItem ? 'Update' : 'Add'} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
