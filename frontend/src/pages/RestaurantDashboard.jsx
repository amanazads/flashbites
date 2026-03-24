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
import Swal from 'sweetalert2';
import {
  createRestaurant, 
  getMyRestaurant, 
  updateRestaurant,
  deleteRestaurant,
  getRestaurantMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getRestaurantAnalytics 
} from '../api/restaurantApi';
import { autocompleteAddress } from '../api/locationApi';
import { getRestaurantOrders, updateOrderStatus } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/constants';
import socketService from '../services/socketService';
import { playNotificationSound } from '../utils/notificationSound';
import AddressInput from '../components/location/AddressInput';
import MapPicker from '../components/location/MapPicker';

const MENU_CATEGORY_OPTIONS = [
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
  'Breads',
  'Rice',
  'Snacks',
  'Fast Food',
  'Pizza',
  'Burger',
  'South Indian',
  'North Indian',
  'Chinese',
  'Paneer',
  'Cake',
  'Biryani',
  'Veg Meal',
  'Noodles',
  'Sandwich',
  'Dosa',
  'Italian',
  'Momos',
  'Chaap',
  'Fries',
  'Shakes',
  'Coffee'
];

const isValidRestaurantCoordPair = (lat, lng) => (
  Number.isFinite(lat)
  && Number.isFinite(lng)
  && lat >= -90
  && lat <= 90
  && lng >= -180
  && lng <= 180
  && !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
);

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
  const [locationDraft, setLocationDraft] = useState({ lat: '', lng: '' });
  const [restaurantLocationSearch, setRestaurantLocationSearch] = useState('');
  const [restaurantLocationSuggestions, setRestaurantLocationSuggestions] = useState([]);
  const [searchingRestaurantLocation, setSearchingRestaurantLocation] = useState(false);
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
    location: null,
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
    categories: [],
    isVeg: true,
    isAvailable: true,
    variants: [],
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

      const myRestaurant = response?.data?.restaurant || null;

      if (myRestaurant) {
        setRestaurant(myRestaurant);
        await fetchMenuItems(myRestaurant._id);

        // Join restaurant room for real-time notifications
        socketService.joinRestaurant(myRestaurant._id);
        console.log('🏪 Joined restaurant room:', myRestaurant._id);
      } else {
        setRestaurant(null);
        setShowRestaurantForm(true);
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

    // Listen for new orders (Data Refresh Only)
    const handleNewOrder = (data) => {
      console.log('🔄 Dashboard: Auto-refreshing data on order event:', data.type);
      
      // Refresh orders list silently, global useNotifications handles UI
      if (autoRefreshOrders && activeTab === 'orders') {
        fetchOrders();
      }
    };

    socketService.onNewOrder(handleNewOrder);

    // Cleanup
    return () => {
      socketService.off('new-order');
    };
  }, [restaurant, activeTab, autoRefreshOrders]);

  // Auto-refresh orders when enabled
  useEffect(() => {
    if (!autoRefreshOrders || activeTab !== 'orders' || !restaurant) return;

    const intervalId = setInterval(() => {
      console.log('Auto-refreshing orders...');
      fetchOrders();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [autoRefreshOrders, activeTab, restaurant]);

  useEffect(() => {
    if (!showRestaurantForm) return;
    const query = restaurantLocationSearch.trim();

    if (query.length < 3) {
      setRestaurantLocationSuggestions([]);
      setSearchingRestaurantLocation(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingRestaurantLocation(true);
      try {
        const response = await autocompleteAddress(query);
        if (cancelled) return;
        const list = response?.data?.suggestions || [];
        setRestaurantLocationSuggestions(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) {
          setRestaurantLocationSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingRestaurantLocation(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [restaurantLocationSearch, showRestaurantForm]);

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

    if (!restaurantData.name?.trim() || !restaurantData.email?.trim() || !restaurantData.phone?.trim()) {
      toast.error('Please fill restaurant name, email, and phone');
      return;
    }

    if (!restaurantData.address?.street?.trim() || !restaurantData.address?.city?.trim() || !restaurantData.address?.state?.trim()) {
      toast.error('Please fill restaurant street, city, and state so we can detect location');
      return;
    }

    try {
      let locationPayload = restaurantData.location;

      const hasValidCoords = Array.isArray(locationPayload?.coordinates)
        && locationPayload.coordinates.length >= 2
        && isValidRestaurantCoordPair(Number(locationPayload.coordinates[1]), Number(locationPayload.coordinates[0]));

      // Geocoding fallback removed; rely on selected suggestion/map/manual coordinates only.

      if (!locationPayload) {
        const draftLat = Number(locationDraft.lat);
        const draftLng = Number(locationDraft.lng);
        if (isValidRestaurantCoordPair(draftLat, draftLng)) {
          locationPayload = {
            type: 'Point',
            coordinates: [draftLng, draftLat]
          };
        }
      }

      if (!locationPayload) {
        toast.error('Please set restaurant coordinates using location search, current location, or manual lat/lng.');
        return;
      }

      const formData = new FormData();
      
      // Append all restaurant data
      formData.append('name', restaurantData.name);
      formData.append('email', restaurantData.email);
      formData.append('phone', restaurantData.phone);
      formData.append('description', restaurantData.description);
      formData.append('cuisines', JSON.stringify(restaurantData.cuisines));
      formData.append('address', JSON.stringify(restaurantData.address));
      if (locationPayload) {
        formData.append('location', JSON.stringify(locationPayload));
        formData.append('lat', String(locationPayload.coordinates[1]));
        formData.append('lng', String(locationPayload.coordinates[0]));
      }
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
    
    // Client-side validation
    if (!menuItemData.name?.trim()) {
      toast.error('Please enter the item name');
      return;
    }
    if (!menuItemData.description?.trim()) {
      toast.error('Please enter a description for the item!');
      return;
    }
    if (!menuItemData.price || parseFloat(menuItemData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!menuItemData.categories || menuItemData.categories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    
    try {
      const formData = new FormData();
      
      // Append menu item data
      formData.append('name', menuItemData.name.trim());
      formData.append('description', menuItemData.description.trim());
      formData.append('price', menuItemData.price);
      formData.append('categories', JSON.stringify(menuItemData.categories));
      formData.append('category', menuItemData.categories[0]);
    formData.append('isVeg', menuItemData.isVeg);
    formData.append('isAvailable', Boolean(menuItemData.isAvailable));
    if (menuItemData.variants) {
      formData.append('variants', JSON.stringify(menuItemData.variants));
    }
    
    // Explicitly send an empty image so backend knows we removed it
    if (menuItemData.image === '') {
      formData.append('image', '');
    }

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
        categories: [],
        isVeg: true,
        isAvailable: true,
        variants: [],
      });
      
      // Immediately refresh menu items
      await fetchMenuItems(restaurant._id);
      console.log('Menu items refreshed after add/update');
    } catch (error) {
      // Show the exact server error message for easy debugging
      const msg = error.response?.data?.message || error.message || 'Failed to save menu item';
      toast.error(msg);
      console.error('Menu item save error:', error.response?.data || error.message);
    }
  };


  const handleDeleteMenuItem = async (itemId) => {
    const result = await Swal.fire({
      title: 'Delete this menu item?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteMenuItem(restaurant._id, itemId);
      toast.success('Menu item deleted');
      await fetchMenuItems(restaurant._id);
    } catch (error) {
      toast.error('Failed to delete menu item');
      console.error('Delete error:', error);
    }
  };

  const handleToggleAvailability = async (itemId) => {
    try {
      await toggleMenuItemAvailability(restaurant._id, itemId);
      toast.success('Availability changed');
      await fetchMenuItems(restaurant._id);
    } catch (error) {
      toast.error('Failed to change status');
      console.error('Toggle error:', error);
    }
  };

  const handleDeleteRestaurant = async () => {
    const result = await Swal.fire({
      title: 'Delete your restaurant?',
      html: 'This will permanently delete <strong>all menu items and order history</strong>. This action cannot be undone.',
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, delete everything',
      input: 'text',
      inputLabel: 'Type DELETE to confirm',
      inputPlaceholder: 'DELETE',
      inputValidator: (value) => {
        if (value !== 'DELETE') return 'Please type DELETE exactly to confirm';
      },
    });
    if (!result.isConfirmed) return;

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
      category: item.category || item.categories?.[0] || '',
      categories: Array.isArray(item.categories) && item.categories.length > 0 ? item.categories : (item.category ? [item.category] : []),
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      variants: item.variants ? item.variants.map(v => ({ ...v })) : [],
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

  const applyLocationCoordinates = (lat, lng) => {
    if (!isValidRestaurantCoordPair(lat, lng)) {
      return false;
    }
    setRestaurantData((prev) => ({
      ...prev,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }));
    setLocationDraft({ lat: String(lat), lng: String(lng) });
    return true;
  };

  const getGeoFailureMessage = (error) => {
    if (!window.isSecureContext) {
      return 'Location capture needs HTTPS (or localhost). Enter latitude/longitude manually below.';
    }

    if (error?.code === 1) {
      return 'Location permission is blocked. Please allow location for browser/app and try again.';
    }
    if (error?.code === 2) {
      return 'Location signal is unavailable right now. Move to open sky and retry, or enter latitude/longitude manually.';
    }
    if (error?.code === 3) {
      return 'Location request timed out. Retry once, or enter latitude/longitude manually.';
    }
    return 'Unable to capture location automatically. Enter latitude/longitude manually below.';
  };

  const handleManualLocationChange = (field, value) => {
    setLocationDraft((prev) => {
      const next = { ...prev, [field]: value };
      const lat = Number(next.lat);
      const lng = Number(next.lng);

      if (next.lat.trim() === '' || next.lng.trim() === '') {
        setRestaurantData((current) => ({ ...current, location: null }));
        return next;
      }

      if (isValidRestaurantCoordPair(lat, lng)) {
        setRestaurantData((current) => ({
          ...current,
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        }));
      }

      return next;
    });
  };

  const handleUseRestaurantCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device. Enter latitude/longitude manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        if (!applyLocationCoordinates(lat, lng)) {
          toast.error('Could not fetch valid coordinates. Please try again.');
          return;
        }
        toast.success('Restaurant location captured');
      },
      (error) => {
        // Retry once with lower accuracy because some devices fail high-accuracy requests.
        if (error?.code === 2 || error?.code === 3) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = Number(position.coords.latitude);
              const lng = Number(position.coords.longitude);
              if (applyLocationCoordinates(lat, lng)) {
                toast.success('Restaurant location captured');
                return;
              }
              toast.error('Could not fetch valid coordinates. Enter latitude/longitude manually.');
            },
            (fallbackError) => {
              toast.error(getGeoFailureMessage(fallbackError));
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
          return;
        }

        toast.error(getGeoFailureMessage(error));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleRestaurantLocationSuggestionSelect = (suggestion) => {
    const lat = Number(suggestion?.lat);
    const lng = Number(suggestion?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('This suggestion does not contain valid coordinates. Please try another result.');
      return;
    }

    applyLocationCoordinates(lat, lng);
    setRestaurantLocationSearch(suggestion?.fullAddress || suggestion?.label || '');
    setRestaurantLocationSuggestions([]);

    setRestaurantData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        street: suggestion?.street || prev.address.street,
        city: suggestion?.city || prev.address.city,
        state: suggestion?.state || prev.address.state,
        zipCode: suggestion?.zipCode || prev.address.zipCode,
      }
    }));
  };

  const handleRestaurantGoogleAddressSelect = (selection) => {
    const lat = Number(selection?.lat);
    const lng = Number(selection?.lng);

    if (isValidRestaurantCoordPair(lat, lng)) {
      applyLocationCoordinates(lat, lng);
    }

    setRestaurantLocationSearch(selection?.fullAddress || selection?.address || '');
    setRestaurantLocationSuggestions([]);

    setRestaurantData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        street: selection?.street || selection?.address || prev.address.street,
        city: selection?.city || prev.address.city,
        state: selection?.state || prev.address.state,
        zipCode: selection?.zipCode || prev.address.zipCode
      }
    }));
  };

  const handleRestaurantMapSelect = ({ lat, lng }) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isValidRestaurantCoordPair(latNum, lngNum)) return;
    applyLocationCoordinates(latNum, lngNum);
  };

  // Show loading while checking authentication
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!restaurant && !showRestaurantForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto container-px">
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
    <div className="min-h-screen bg-gray-50 py-8 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-8">
      <div className="max-w-7xl mx-auto container-px">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {restaurant?.image && (
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-primary-500 flex-shrink-0"
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
                    const coords = Array.isArray(restaurant.location?.coordinates)
                      ? restaurant.location.coordinates
                      : [];
                    const existingLng = Number(coords[0]);
                    const existingLat = Number(coords[1]);

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
                    setLocationDraft({
                      lat: Number.isFinite(existingLat) ? String(existingLat) : '',
                      lng: Number.isFinite(existingLng) ? String(existingLng) : ''
                    });
                    setRestaurantLocationSearch(restaurant?.address?.street || '');
                    setRestaurantLocationSuggestions([]);
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
                <ChartBarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-primary-500 flex-shrink-0" />
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
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'menu'
                        ? 'border-primary-500 text-primary-600'
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
                        ? 'border-primary-500 text-primary-600'
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
                        ? 'border-primary-500 text-primary-600'
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
                <div className="mb-6 p-4 border-2 border-primary-200 rounded-lg bg-primary-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
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
                    <p className="font-medium break-words">{restaurant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium break-all">{restaurant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium break-words">{restaurant.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cuisines</p>
                    <p className="font-medium break-words">{restaurant.cuisines?.join(', ')}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium break-words">{restaurant.description}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium break-words">
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
                          categories: [],
                          isVeg: true,
                          isAvailable: true,
                          variants: [],
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
                                  onClick={() => handleToggleAvailability(item._id)}
                                  className={`p-1.5 rounded transition-colors ${item.isAvailable ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                  title="Toggle availability"
                                >
                                  {item.isAvailable ? (
                                    <CheckCircleIcon className="h-5 w-5" />
                                  ) : (
                                    <XCircleIcon className="h-5 w-5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleEditMenuItem(item)}
                                  className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded"
                                  title="Edit item"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item._id)}
                                  className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded"
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
                              <span className="font-bold text-xl text-primary-600">
                                ₹{item.price} <span className="text-xs text-gray-500 font-normal">{item.variants && item.variants.length > 0 ? "onwards" : ""}</span>
                              </span>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {Array.isArray(item.categories) && item.categories.length > 0 ? item.categories.join(', ') : item.category}
                              </span>
                            </div>
                            
                            {item.variants && item.variants.length > 0 && (
                              <div className="mb-2 space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {item.variants.map((v, i) => (
                                    <span key={i} className="text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                                      {v.name}: ₹{v.price}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-2 text-xs">
                              {item.isAvailable ? (
                                <span className="text-green-600 font-medium">✓ Available to order</span>
                              ) : (
                                <span className="text-red-500 font-medium">✗ Currently Unavailable</span>
                              )}
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
                    <button
                      onClick={() => setAutoRefreshOrders((prev) => !prev)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${autoRefreshOrders ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                      {autoRefreshOrders ? 'Stop Auto Refresh' : 'Start Auto Refresh'}
                    </button>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
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
                                    className="w-full bg-primary-500 rounded-t transition-all"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 pt-[calc(88px+env(safe-area-inset-top))] pb-[calc(120px+env(safe-area-inset-bottom))] z-[1300] overflow-y-auto">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 my-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                {restaurant ? 'Edit Restaurant' : 'Register Restaurant'}
              </h2>
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Step 1</p>
                <h3 className="text-lg font-bold text-gray-900">Restaurant Information</h3>
                <p className="text-sm text-gray-600">Add restaurant identity, location and contact details.</p>
              </div>
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Pick Restaurant Location</p>
                  <AddressInput
                    value={restaurantLocationSearch}
                    onChange={setRestaurantLocationSearch}
                    onSelect={handleRestaurantGoogleAddressSelect}
                    placeholder="Search area, street, landmark"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      value={restaurantLocationSearch}
                      onChange={(e) => setRestaurantLocationSearch(e.target.value)}
                      placeholder="Search area, street, landmark"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {searchingRestaurantLocation && (
                      <p className="mt-1 text-xs text-gray-500">Searching location...</p>
                    )}
                    {restaurantLocationSuggestions.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                        {restaurantLocationSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.placeId || suggestion.place_id || `${suggestion.label}-${index}`}
                            type="button"
                            onClick={() => handleRestaurantLocationSuggestionSelect(suggestion)}
                            className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                          >
                            {suggestion.fullAddress || suggestion.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <MapPicker
                      initialPosition={{
                        lat: Number(restaurantData.location?.coordinates?.[1]) || 31.53,
                        lng: Number(restaurantData.location?.coordinates?.[0]) || 75.91
                      }}
                      onSelect={handleRestaurantMapSelect}
                      mapHeight={220}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-gray-600">
                      Set exact location for accurate delivery radius and customer discovery.
                    </p>
                    <button
                      type="button"
                      onClick={handleUseRestaurantCurrentLocation}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200"
                    >
                      Use Current Location
                    </button>
                  </div>
                  <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-3">
                    <p className="text-xs font-medium text-gray-700">Current selected pickup point</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {Array.isArray(restaurantData.location?.coordinates) && restaurantData.location.coordinates.length >= 2
                        ? `${Number(restaurantData.location.coordinates[1]).toFixed(6)}, ${Number(restaurantData.location.coordinates[0]).toFixed(6)}`
                        : 'No coordinates selected yet'}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      value={locationDraft.lat}
                      onChange={(e) => handleManualLocationChange('lat', e.target.value)}
                      placeholder="Latitude (e.g. 19.0760)"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <input
                      type="number"
                      step="any"
                      value={locationDraft.lng}
                      onChange={(e) => handleManualLocationChange('lng', e.target.value)}
                      placeholder="Longitude (e.g. 72.8777)"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  {Array.isArray(restaurantData.location?.coordinates) && restaurantData.location.coordinates.length >= 2 && (
                    <p className="mt-2 text-xs text-green-700">
                      Coordinates set: {Number(restaurantData.location.coordinates[1]).toFixed(6)}, {Number(restaurantData.location.coordinates[0]).toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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

                <div className="sticky bottom-0 bg-white pt-3 pb-[calc(8px+env(safe-area-inset-bottom))] flex justify-end space-x-3 sm:space-x-4 mt-6">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 pt-[calc(88px+env(safe-area-inset-top))] pb-[calc(120px+env(safe-area-inset-bottom))] z-[1300] overflow-y-auto">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 my-4">
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Item Image
                  </label>
                  <input
                    id="menuItemImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleMenuImageChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {menuImagePreview && (
                    <div className="mt-2 relative">
                      <img
                        src={menuImagePreview}
                        alt="Preview"
                        className="h-32 w-full object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMenuImagePreview(null);
                          setMenuImageFile(null);
                          setMenuItemData({ ...menuItemData, image: '' }); // Clear image in the data explicitly
                          // Reset the file input so they can re-select the same image if needed
                          const fileInput = document.getElementById('menuItemImageInput');
                          if (fileInput) fileInput.value = '';
                        }}
                        className="absolute top-2 right-2 bg-white text-red-600 p-1.5 rounded-md shadow hover:bg-red-50"
                        title="Remove Image"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 800x600px, Max 5MB
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description *
                  </label>
                  <textarea
                    value={menuItemData.description}
                    placeholder="Enter item description..."
                    onChange={(e) =>
                      setMenuItemData({
                        ...menuItemData,
                        description: e.target.value,
                      })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Categories *
                    </label>
                    <div className="max-h-44 overflow-y-auto border rounded-lg p-3 grid grid-cols-2 gap-2">
                      {MENU_CATEGORY_OPTIONS.map((category) => {
                        const checked = menuItemData.categories?.includes(category);
                        return (
                          <label key={category} className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const nextCategories = e.target.checked
                                  ? [...(menuItemData.categories || []), category]
                                  : (menuItemData.categories || []).filter((c) => c !== category);

                                setMenuItemData({
                                  ...menuItemData,
                                  categories: nextCategories,
                                  category: nextCategories[0] || '',
                                });
                              }}
                            />
                            <span>{category}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select one or more categories for this item.</p>
                  </div>
                </div>

                {/* Variants Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">Variants (Optional)</label>
                    <button
                      type="button"
                      onClick={() => setMenuItemData({
                        ...menuItemData,
                        variants: [...(menuItemData.variants || []), { name: '', price: '' }]
                      })}
                      className="text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      + Add Variant
                    </button>
                  </div>
                  {(menuItemData.variants || []).map((variant, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-2 items-stretch sm:items-center">
                      <input
                        type="text"
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...menuItemData.variants];
                          newVariants[index] = { ...newVariants[index], name: e.target.value };
                          setMenuItemData({ ...menuItemData, variants: newVariants });
                        }}
                        className="flex-1 min-w-[100px] px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        min="0"
                        value={variant.price}
                        onChange={(e) => {
                          const newVariants = [...menuItemData.variants];
                          newVariants[index] = { ...newVariants[index], price: e.target.value };
                          setMenuItemData({ ...menuItemData, variants: newVariants });
                        }}
                        className="w-full sm:w-24 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newVariants = menuItemData.variants.filter((_, i) => i !== index);
                          setMenuItemData({ ...menuItemData, variants: newVariants });
                        }}
                        className="text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  {(!menuItemData.variants || menuItemData.variants.length === 0) && (
                    <p className="text-xs text-gray-500">Add options like Regular, Medium, Large, Half, Full</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <span className="text-sm font-medium text-gray-700">Dietary Type:</span>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="dietaryType"
                        checked={menuItemData.isVeg === true}
                        onChange={() => setMenuItemData({ ...menuItemData, isVeg: true })}
                        className="mr-1.5"
                      />
                      <span className="text-sm font-medium text-green-700">Veg</span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="dietaryType"
                        checked={menuItemData.isVeg === false}
                        onChange={() => setMenuItemData({ ...menuItemData, isVeg: false })}
                        className="mr-1.5"
                      />
                      <span className="text-sm font-medium text-red-700">Non-Veg</span>
                    </label>
                  </div>

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

                <div className="sticky bottom-0 bg-white pt-3 pb-[calc(8px+env(safe-area-inset-bottom))] flex justify-end space-x-3 sm:space-x-4 mt-6">
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
