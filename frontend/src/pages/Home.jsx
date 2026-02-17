import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../redux/slices/restaurantSlice';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { Loader } from '../components/common/Loader';
import { CUISINES, NEARBY_LOCATIONS } from '../utils/constants';
import { calculateDistance } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';
import toast from 'react-hot-toast';

const Home = () => {
  const dispatch = useDispatch();
  const { restaurants, loading } = useSelector((state) => state.restaurant);
  const { location, error, loading: locationLoading, getLocation, clearLocation } = useGeolocation();
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    dispatch(fetchRestaurants({}));
  }, [dispatch]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationDropdown]);

  useEffect(() => {
    // Filter restaurants by distance when location or restaurants change
    if (userLocation && restaurants.length > 0) {
      filterRestaurantsByDistance();
    }
  }, [userLocation, restaurants]);

  const requestLocationPermission = async () => {
    try {
      // Try network-based location first (faster, more reliable)
      const locationData = await getLocation({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 600000
      });
      setUserLocation(locationData);
      setSelectedLocationName('Current Location');
      setShowLocationDropdown(false);
      toast.success('Location detected! Showing nearby restaurants');
    } catch (err) {
      // Silently show location dropdown without error toast
      setShowLocationDropdown(true);
    }
  };

  const selectNearbyLocation = (location) => {
    setUserLocation(location.coordinates);
    setSelectedLocationName(location.name);
    setShowLocationDropdown(false);
    toast.success(`Showing restaurants near ${location.name}`);
  };

  const clearSelectedLocation = () => {
    setUserLocation(null);
    setSelectedLocationName('');
    clearLocation();
    setNearbyRestaurants([]);
  };

  const filterRestaurantsByDistance = () => {
    const MAX_DISTANCE = 50; // 50 km radius
    
    const restaurantsWithDistance = restaurants.map(restaurant => {
      if (restaurant.location?.coordinates && restaurant.location.coordinates.length === 2) {
        const [restLng, restLat] = restaurant.location.coordinates;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          restLat,
          restLng
        );
        return { ...restaurant, distance };
      }
      return { ...restaurant, distance: Infinity };
    });

    // Filter and sort by distance
    const filtered = restaurantsWithDistance
      .filter(r => r.distance <= MAX_DISTANCE)
      .sort((a, b) => a.distance - b.distance);

    setNearbyRestaurants(filtered);
  };

  const displayRestaurants = userLocation && nearbyRestaurants.length > 0 
    ? nearbyRestaurants 
    : restaurants;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Order Your Favorite Food
            </h1>
            <p className="text-base sm:text-lg lg:text-xl mb-4 text-orange-100 px-2 sm:px-0">
              Get your food delivered fast from top restaurants
            </p>
            
            {/* Location Status */}
            {locationLoading ? (
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-sm text-orange-100">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Detecting your location...</span>
                </div>
              </div>
            ) : userLocation ? (
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-sm text-orange-100 bg-white/10 px-4 py-2 rounded-lg">
                  <span>📍 {selectedLocationName} ({nearbyRestaurants.length} restaurants found)</span>
                  <button
                    onClick={clearSelectedLocation}
                    className="ml-2 text-orange-100 hover:text-white"
                    title="Clear location"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 relative">
                <button
                  onClick={requestLocationPermission}
                  className="inline-flex items-center gap-2 text-sm text-orange-100 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all w-full sm:w-auto justify-center"
                >
                  📍 Find restaurants near me
                </button>
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="mt-2 sm:mt-0 sm:ml-3 inline-flex items-center gap-2 text-sm text-orange-100 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all w-full sm:w-auto justify-center"
                >
                  📌 Select Location
                </button>

                {/* Location Dropdown */}
                {showLocationDropdown && (
                  <div ref={dropdownRef} className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bg-white rounded-lg shadow-xl border border-gray-200 z-10 w-full sm:w-72 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-700">Choose your location</p>
                    </div>
                    
                    {/* Use Current Location Option */}
                    <button
                      onClick={requestLocationPermission}
                      disabled={locationLoading}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <div className="font-medium text-orange-600">
                            {locationLoading ? 'Detecting location...' : 'Use Current Location'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {locationLoading ? 'Please wait...' : 'Enable GPS for accurate results'}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Nearby Locations */}
                    <div className="py-1">
                      <div className="px-4 py-2 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Popular Locations</p>
                      </div>
                      {NEARBY_LOCATIONS.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => selectNearbyLocation(loc)}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{loc.name}</div>
                          <div className="text-xs text-gray-500">{loc.district}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <Link to="/restaurants" className="bg-white text-orange-600 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block w-full sm:w-auto">
                Explore Restaurants
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cuisines Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">What's on your mind?</h2>
        <p className="text-gray-600 mb-8">Explore cuisines that excite your taste buds</p>
        
        {/* Horizontal Scrolling Container */}
        <div className="relative overflow-hidden">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {/* Indian */}
            <Link
              to="/restaurants?cuisine=Indian"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍛</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Indian</h3>
            </Link>

            {/* Chinese */}
            <Link
              to="/restaurants?cuisine=Chinese"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🥡</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Chinese</h3>
            </Link>

            {/* Italian */}
            <Link
              to="/restaurants?cuisine=Italian"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍝</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Italian</h3>
            </Link>

            {/* Mexican */}
            <Link
              to="/restaurants?cuisine=Mexican"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🌮</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Mexican</h3>
            </Link>

            {/* Thai */}
            <Link
              to="/restaurants?cuisine=Thai"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍜</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Thai</h3>
            </Link>

            {/* Japanese */}
            <Link
              to="/restaurants?cuisine=Japanese"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍣</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Japanese</h3>
            </Link>

            {/* American */}
            <Link
              to="/restaurants?cuisine=American"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍔</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">American</h3>
            </Link>

            {/* Mediterranean */}
            <Link
              to="/restaurants?cuisine=Mediterranean"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🥙</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Mediterranean</h3>
            </Link>

            {/* Continental */}
            <Link
              to="/restaurants?cuisine=Continental"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍽️</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Continental</h3>
            </Link>

            {/* Fast Food */}
            <Link
              to="/restaurants?cuisine=Fast Food"
              className="group flex flex-col items-center flex-shrink-0 snap-start"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-3 group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-4xl sm:text-5xl">🍕</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm text-center">Fast Food</h3>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Restaurants */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {userLocation && nearbyRestaurants.length > 0 ? 'Restaurants Near You' : 'Top Restaurants'}
          </h2>
          <Link to="/restaurants" className="text-orange-600 hover:text-orange-700 font-semibold text-sm sm:text-base whitespace-nowrap">
            View All →
          </Link>
        </div>

        {loading ? (
          <Loader />
        ) : displayRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayRestaurants.slice(0, 8).map((restaurant) => (
              <div key={restaurant._id}>
                <RestaurantCard restaurant={restaurant} />
                {restaurant.distance && restaurant.distance !== Infinity && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    📍 {restaurant.distance.toFixed(1)} km away
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {userLocation 
                ? 'No restaurants found near your location. Try expanding your search area.'
                : 'No restaurants available at the moment.'}
            </p>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 sm:mb-12 text-center">
            Why Choose FlashBites?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Fast Delivery</h3>
              <p className="text-gray-600">Get your food delivered in 30 minutes or less</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍴</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Wide Selection</h3>
              <p className="text-gray-600">Choose from hundreds of restaurants</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💯</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Quality Assured</h3>
              <p className="text-gray-600">Only verified and top-rated restaurants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;