import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { fetchRestaurants, setFilters } from '../redux/slices/restaurantSlice';
import { searchRestaurantsAndItems } from '../api/restaurantApi';
import { getAddresses } from '../api/userApi';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { Loader } from '../components/common/Loader';
import AddAddressModal from '../components/common/AddAddressModal';
import LocationGateModal from '../components/location/LocationGateModal';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { BRAND } from '../constants/theme';
import { setSelectedDeliveryAddress } from '../redux/slices/uiSlice';
import { buildManualAddressSelection, mapSavedAddressToSelection } from '../utils/deliveryAddress';
import toast from 'react-hot-toast';

const isNativePlatform = () => !!(
  typeof window !== 'undefined'
  && window.Capacitor
  && typeof window.Capacitor.isNativePlatform === 'function'
  && window.Capacitor.isNativePlatform()
);

const CUISINE_TABS = [
  { id: 'All',       label: 'All',       image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&q=80' },
  { id: 'Pizza',     label: 'Pizza',     image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&q=80' },
  { id: 'Burger',    label: 'Burgers',   image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&q=80' },
  { id: 'Indian',    label: 'Thali',     image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=120&q=80' },
  { id: 'Chinese',   label: 'Noodles',   image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=120&q=80' },
  { id: 'Italian',   label: 'Pasta',     image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=120&q=80' },
  { id: 'Japanese',  label: 'Sushi',     image: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=120&q=80' },
  { id: 'Mexican',   label: 'Mexican',   image: 'https://images.unsplash.com/photo-1617191519105-d07b98b10b88?w=120&q=80' },
  { id: 'Thai',      label: 'Thai',      image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=120&q=80' },
  { id: 'Fast Food', label: 'Fast Food', image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=120&q=80' },
  { id: 'Desserts',  label: 'Desserts',  image: 'https://images.unsplash.com/photo-1505253216365-1dce1a8f94a5?w=120&q=80' },
  { id: 'Coffee',    label: 'Drinks',    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&q=80' },
];

const SORT_OPTIONS = ['Ratings 4.0+', 'New to you', 'Fastest delivery', 'Free delivery'];

const RestaurantPage = () => {
  const dispatch = useDispatch();
  const { restaurants, loading, filters } = useSelector((s) => s.restaurant);
  const { isAuthenticated } = useSelector((s) => s.auth);
  const selectedAddress = useSelector((s) => s.ui.selectedDeliveryAddress);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [activeSort, setActiveSort] = useState(null);
  const [searchResultRestaurants, setSearchResultRestaurants] = useState([]);
  const [searchResultItems, setSearchResultItems] = useState([]);
  const [searchMatchedItemsByRestaurant, setSearchMatchedItemsByRestaurant] = useState({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [showLocationGate, setShowLocationGate] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const routerLocation = useLocation();
  const params = new URLSearchParams(routerLocation.search);
  const searchQuery = params.get('search')?.trim() || '';
  const cuisineQuery = params.get('cuisine')?.trim() || '';
  const inSearchMode = searchQuery.length > 0;

  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!isAuthenticated) {
        setSavedAddresses([]);
        setAddressesLoaded(true);
        return;
      }

      try {
        const res = await getAddresses();
        const addrs = res?.data?.addresses || [];
        setSavedAddresses(addrs);

        if (!selectedAddress && addrs.length > 0) {
          const preferred = addrs.find((a) => a.isDefault) || addrs[0];
          const mapped = mapSavedAddressToSelection(preferred);
          if (mapped) {
            dispatch(setSelectedDeliveryAddress(mapped));
          }
        }
      } catch {
        setSavedAddresses([]);
      } finally {
        setAddressesLoaded(true);
      }
    };

    loadSavedAddresses();
  }, [dispatch, isAuthenticated, selectedAddress]);

  useEffect(() => {
    if (!addressesLoaded) return;
    setShowLocationGate(!selectedAddress);
  }, [addressesLoaded, selectedAddress]);

  useEffect(() => {
    if (!inSearchMode) {
      setSearchResultItems([]);
      setSearchMatchedItemsByRestaurant({});
      setSearchResultRestaurants([]);
      setSearchLoading(false);
      return;
    }

    if (filters.search !== searchQuery) {
      dispatch(setFilters({ search: searchQuery }));
    }

    let cancelled = false;

    const runSearch = async () => {
      setSearchLoading(true);
      try {
        const response = await searchRestaurantsAndItems({
          q: searchQuery,
          limit: 30,
          city: selectedAddress?.city || undefined,
        });
        const payload = response?.data || {};
        if (cancelled) return;

        const restaurantMap = new Map((payload?.restaurants || []).map((r) => [String(r._id), r]));
        const matchesByRestaurant = {};

        (payload?.items || []).forEach((item) => {
          const rid = String(item.restaurantId || '');
          if (!rid) return;

          if (!restaurantMap.has(rid)) {
            restaurantMap.set(rid, {
              _id: rid,
              name: item.restaurantName || 'Restaurant',
              cuisines: [],
              image: null,
            });
          }

          if (!Array.isArray(matchesByRestaurant[rid])) {
            matchesByRestaurant[rid] = [];
          }
          matchesByRestaurant[rid].push(item);
        });

        setSearchResultItems(payload?.items || []);
        setSearchMatchedItemsByRestaurant(matchesByRestaurant);
        setSearchResultRestaurants(Array.from(restaurantMap.values()));
      } catch {
        if (!cancelled) {
          setSearchResultItems([]);
          setSearchMatchedItemsByRestaurant({});
          setSearchResultRestaurants([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [dispatch, inSearchMode, searchQuery, filters.search, selectedAddress?.city]);

  useEffect(() => {
    if (inSearchMode) return;

    const nextCuisine = cuisineQuery || 'All';
    setSelectedCuisine(nextCuisine);
    dispatch(setFilters({ cuisine: cuisineQuery || null, search: '' }));
  }, [dispatch, inSearchMode, cuisineQuery]);

  useEffect(() => {
    if (inSearchMode) return;
    if (!selectedAddress?.latitude || !selectedAddress?.longitude) {
      dispatch(fetchRestaurants(filters));
      return;
    }

    dispatch(fetchRestaurants({
      ...filters,
      lat: Number(selectedAddress.latitude),
      lng: Number(selectedAddress.longitude),
      radius: 50000,
      city: selectedAddress.city || undefined,
      zipCode: selectedAddress.zipCode || undefined,
      state: selectedAddress.state || undefined,
    }));
  }, [dispatch, filters, inSearchMode, selectedAddress]);

  const sourceRestaurants = inSearchMode ? searchResultRestaurants : restaurants;
  const displayedRestaurants = selectedCuisine === 'All'
    ? sourceRestaurants
    : sourceRestaurants.filter((r) => Array.isArray(r.cuisines) && r.cuisines.some((c) => String(c).toLowerCase() === selectedCuisine.toLowerCase()));

  const handleCuisine = (label) => {
    setSelectedCuisine(label);
    dispatch(setFilters({ cuisine: label === 'All' ? null : label }));
  };

  const handleSelectSavedAddress = (addr) => {
    const mapped = mapSavedAddressToSelection(addr);
    if (!mapped) {
      toast.error('This address is missing coordinates. Please re-add it from suggestions.');
      return;
    }

    dispatch(setSelectedDeliveryAddress(mapped));
    setShowLocationGate(false);
  };

  const handleUseCurrentLocation = async () => {
    setDetectingLocation(true);

    const applyPosition = (position) => {
      const latitude = Number(position?.coords?.latitude || 0);
      const longitude = Number(position?.coords?.longitude || 0);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
        throw new Error('Invalid location coordinates');
      }

      const selection = buildManualAddressSelection({
        id: 'current-location',
        type: 'current',
        city: 'Current Area',
        fullAddress: `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        latitude,
        longitude,
      });

      dispatch(setSelectedDeliveryAddress(selection));
      setShowLocationGate(false);
      toast.success('Current location selected');
    };

    try {
      if (isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.requestPermissions();
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 180000,
        });
        applyPosition(position);
        return;
      }

      if (!navigator.geolocation) {
        throw new Error('Location services are not supported on this device.');
      }

      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 180000,
        });
      }).then(applyPosition);
    } catch {
      toast.error('Unable to access your location. Please allow location permission or select an address manually.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleAddressAdded = (newAddress) => {
    setSavedAddresses((prev) => {
      const filtered = prev.filter((addr) => addr._id !== newAddress._id);
      return [newAddress, ...filtered];
    });

    const mapped = mapSavedAddressToSelection(newAddress);
    if (!mapped) {
      toast.error('Address added without valid coordinates. Please re-add it from suggestions.');
      return;
    }

    dispatch(setSelectedDeliveryAddress(mapped));
    setShowLocationGate(false);
  };

  const handleManualAddressSelected = (selection) => {
    dispatch(setSelectedDeliveryAddress(selection));
    setShowLocationGate(false);
  };

  return (
    <div className="page-wrapper">

      {/* ── Sticky cuisine tab row ── */}
      <div
        className="sticky top-[56px] sm:top-[72px] max-[388px]:top-[48px] bg-white z-10"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 max-[388px]:px-1">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-3 max-[388px]:py-2">
            {CUISINE_TABS.map((tab) => {
              const active = selectedCuisine === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleCuisine(tab.id)}
                  className="flex-shrink-0 flex flex-col items-center px-3 py-2 max-[388px]:px-2.5 max-[388px]:py-1.5 rounded-2xl transition-all duration-200 min-w-[52px] max-[388px]:min-w-[46px]"
                  style={active
                    ? { background: '#FFF0ED', color: BRAND }
                    : { color: '#9CA3AF' }}
                >
                  <img
                    src={tab.image}
                    alt={tab.label}
                    className={`h-8 w-8 max-[388px]:h-7 max-[388px]:w-7 rounded-full object-cover ${
                      active ? 'ring-2 ring-[#EA580C]' : 'ring-1 ring-black/5'
                    }`}
                    loading="lazy"
                  />
                  <span className="text-[11px] max-[388px]:text-[10px] font-semibold mt-1 whitespace-nowrap"
                    style={active ? { color: BRAND } : { color: '#6B7280' }}>
                    {tab.label}
                  </span>
                  {active && (
                    <span className="h-0.5 w-5 rounded-full mt-1" style={{ background: BRAND }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort pills */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-[388px]:px-3 pb-3 max-[388px]:pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button className="flex-shrink-0 flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-xs max-[388px]:text-[11px] font-semibold px-3 py-1.5 max-[388px]:px-2.5 max-[388px]:py-1 rounded-xl shadow-sm hover:border-gray-300 transition-all">
              <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
              Filters
            </button>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSort(activeSort === s ? null : s)}
                className="flex-shrink-0 text-xs max-[388px]:text-[11px] font-semibold px-3 py-1.5 max-[388px]:px-2.5 max-[388px]:py-1 rounded-xl border transition-all whitespace-nowrap"
                style={activeSort === s
                  ? { background: BRAND, color: 'white', borderColor: 'transparent' }
                  : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-[388px]:px-3 py-5 max-[388px]:py-4">
        <div className="mb-5">
          <h1 className="text-xl max-[388px]:text-lg font-bold text-gray-900">
            {inSearchMode ? `Search results for "${searchQuery}"` : 'Restaurants near you'}
          </h1>
          {!loading && !searchLoading && (
            <p className="text-sm max-[388px]:text-xs text-gray-400 mt-0.5">
              {displayedRestaurants.length} restaurants
              {inSearchMode ? ` · ${searchResultItems.length} items` : ''}
              {selectedCuisine !== 'All' ? ` · ${selectedCuisine}` : ''}
              {selectedAddress?.city ? ` · ${selectedAddress.city}` : ''}
            </p>
          )}
        </div>

        {(loading || searchLoading) ? (
          <Loader />
        ) : displayedRestaurants.length === 0 && (!inSearchMode || searchResultItems.length === 0) ? (
          <div className="text-center py-24 max-[388px]:py-20">
            <div className="text-6xl max-[388px]:text-5xl mb-4 animate-float">🍽️</div>
            <h3 className="text-xl max-[388px]:text-lg font-bold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-400 text-sm max-[388px]:text-xs mb-5">Try adjusting your filter</p>
            <button
              onClick={() => { setSelectedCuisine('All'); dispatch(setFilters({ cuisine: null, search: null })); }}
              className="btn-primary text-sm max-[388px]:text-xs"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {inSearchMode && searchResultItems.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">Matched Menu Items</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResultItems.slice(0, 24).map((item) => (
                    <Link
                      key={item._id}
                      to={`/restaurant/${item.restaurantId}`}
                      className="bg-white rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.restaurantName || 'Restaurant'}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          {Array.isArray(item.categories) && item.categories.length > 0 ? item.categories[0] : item.category || 'Menu Item'}
                        </span>
                        <span className="text-sm font-bold" style={{ color: BRAND }}>₹{item.price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {displayedRestaurants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 max-[388px]:gap-3">
                {displayedRestaurants.map((r) => (
                  <RestaurantCard
                    key={r._id}
                    restaurant={r}
                    matchedItems={searchMatchedItemsByRestaurant[String(r._id)] || []}
                    matchedItemsTitle={inSearchMode ? 'Matched items' : null}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onAddressAdded={handleAddressAdded}
        onAddressSelected={handleManualAddressSelected}
        saveToAccount={isAuthenticated}
        title={isAuthenticated ? 'Add Delivery Address' : 'Select Delivery Address'}
        submitLabel={isAuthenticated ? 'Save Address' : 'Use This Address'}
      />
      <LocationGateModal
        isOpen={showLocationGate}
        selectedAddress={selectedAddress}
        savedAddresses={savedAddresses}
        isAuthenticated={isAuthenticated}
        detectingLocation={detectingLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
        onSelectSavedAddress={handleSelectSavedAddress}
        onOpenManualAddress={() => {
          setShowLocationGate(false);
          setTimeout(() => setShowAddAddressModal(true), 120);
        }}
        onClose={() => setShowLocationGate(false)}
      />
    </div>
  );
};

export default RestaurantPage;
