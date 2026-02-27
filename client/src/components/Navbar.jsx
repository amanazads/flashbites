import { useState, useEffect, useRef } from 'react';
import { IoLocationSharp, IoNotifications, IoCheckmark, IoOptionsOutline, IoClose, IoGiftOutline, IoCheckmarkCircle, IoInformationCircle, IoAlertCircle } from 'react-icons/io5';

const cities = [
  { id: 1, name: 'New York, NY', available: true },
  { id: 2, name: 'Los Angeles, CA', available: true },
  { id: 3, name: 'Chicago, IL', available: true },
  { id: 4, name: 'Houston, TX', available: true },
  { id: 5, name: 'Miami, FL', available: true },
  { id: 6, name: 'San Francisco, CA', available: true },
  { id: 7, name: 'Boston, MA', available: true },
  { id: 8, name: 'Seattle, WA', available: true },
  { id: 9, name: 'Atlanta, GA', available: true },
  { id: 10, name: 'Dallas, TX', available: true },
];

const initialNotifications = [
  {
    id: 1,
    type: 'offer',
    icon: IoGiftOutline,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: '50% OFF on First Order!',
    message: 'Use code FLASH50 for 50% discount on your first 3 orders',
    time: '5 min ago',
    isNew: true
  },
  {
    id: 2,
    type: 'success',
    icon: IoCheckmarkCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Order Delivered Successfully',
    message: 'Your order #12345 was delivered. Hope you enjoyed!',
    time: '2 hours ago',
    isNew: false
  },
  {
    id: 3,
    type: 'info',
    icon: IoInformationCircle,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'New Restaurants Added',
    message: '10 new restaurants are now available in your area',
    time: '1 day ago',
    isNew: true
  },
];

const Navbar = () => {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('deliveryCity') || 'New York, NY';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filters, setFilters] = useState({
    sortBy: 'rating',
    freeDelivery: false,
    minRating: 0,
    priceRange: 'all',
  });
  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const filterRef = useRef(null);

  const unreadCount = notifications.filter(n => n.isNew).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCitySelect = (city) => {
    setSelectedCity(city.name);
    localStorage.setItem('deliveryCity', city.name);
    setIsDropdownOpen(false);
  };

  const handleRemoveNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isNew: false })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    setFilters({
      sortBy: 'rating',
      freeDelivery: false,
      minRating: 0,
      priceRange: 'all',
    });
  };

  const activeFilterCount = [
    filters.freeDelivery,
    filters.minRating > 0,
    filters.priceRange !== 'all',
    filters.sortBy !== 'rating'
  ].filter(Boolean).length;

  return (
    <div className="bg-white px-4 py-4 sticky top-0 z-50 shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="bg-orange-500 p-2 rounded-lg shadow-sm transition-colors hover:bg-orange-600">
              <IoLocationSharp className="text-white text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Deliver to</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                {selectedCity}
                <span className={`text-xs text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </p>
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 max-h-96 overflow-y-auto z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Select Delivery Location</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose your city</p>
              </div>
              
              <div className="py-1">
                {cities.map((city) => (
                  <div
                    key={city.id}
                    onClick={() => handleCitySelect(city)}
                    className={`px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors flex items-center justify-between ${
                      selectedCity === city.name ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IoLocationSharp className={`text-lg ${selectedCity === city.name ? 'text-orange-500' : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-sm font-medium ${selectedCity === city.name ? 'text-orange-600' : 'text-gray-900'}`}>
                          {city.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {city.available ? 'Available for delivery' : 'Coming soon'}
                        </p>
                      </div>
                    </div>
                    {selectedCity === city.name && (
                      <IoCheckmark className="text-orange-500 text-lg" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter Button */}
          <div className="relative" ref={filterRef}>
            <div 
              className="bg-gray-100 p-2.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer relative"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <IoOptionsOutline className="text-xl text-gray-700" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </div>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between sticky top-0">
                  <h3 className="text-white font-semibold text-base">Filters</h3>
                  <button
                    onClick={resetFilters}
                    className="text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors font-medium"
                  >
                    Reset All
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Sort By */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">⭐ Sort By</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'rating', label: 'Top Rated', emoji: '⭐' },
                        { value: 'deliveryTime', label: 'Fastest', emoji: '⚡' },
                        { value: 'priceAsc', label: 'Budget', emoji: '💰' },
                        { value: 'priceDesc', label: 'Premium', emoji: '💎' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFilterChange('sortBy', option.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filters.sortBy === option.value
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.emoji} {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Free Delivery */}
                  <div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-semibold text-gray-900">🚚 Free Delivery Only</span>
                      <input
                        type="checkbox"
                        checked={filters.freeDelivery}
                        onChange={(e) => handleFilterChange('freeDelivery', e.target.checked)}
                        className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                      />
                    </label>
                  </div>

                  {/* Rating */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">⭐ Minimum Rating</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 0, label: 'Any' },
                        { value: 3.0, label: '3.0+' },
                        { value: 4.0, label: '4.0+' },
                        { value: 4.5, label: '4.5+' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFilterChange('minRating', option.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filters.minRating === option.value
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">💰 Price Range</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: '$', label: '$' },
                        { value: '$$', label: '$$' },
                        { value: '$$$', label: '$$$' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFilterChange('priceRange', option.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filters.priceRange === option.value
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Button */}
          <div className="relative" ref={notificationRef}>
            <div 
              className="bg-gray-100 p-2.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            >
              <IoNotifications className="text-xl text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-base">Notifications</h3>
                    <p className="text-orange-100 text-xs">{notifications.length} total</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-3">🔔</div>
                      <p className="text-gray-500 text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const Icon = notification.icon;
                      return (
                        <div
                          key={notification.id}
                          className={`border-b border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors relative ${
                            notification.isNew ? 'bg-orange-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`${notification.bgColor} ${notification.borderColor} border p-2 rounded-lg flex-shrink-0`}>
                              <Icon className={`${notification.iconColor} text-xl`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  {notification.title}
                                  {notification.isNew && (
                                    <span className="ml-2 inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                                  )}
                                </h4>
                                <button
                                  onClick={() => handleRemoveNotification(notification.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                                >
                                  <IoClose className="text-lg" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
