import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../redux/slices/restaurantSlice';
import { addToCart, clearCart } from '../redux/slices/cartSlice';
import { openCart, setSelectedDeliveryAddress } from '../redux/slices/uiSlice';
import { getAddresses } from '../api/userApi';
import { getRestaurantMenuItems, searchRestaurantsAndItems } from '../api/restaurantApi';
import AddAddressModal from '../components/common/AddAddressModal';
import SEO from '../components/common/SEO';
import { BRAND } from '../constants/theme';
import logo from '../assets/logo.png';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import {
  GlobeAltIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ShoppingBagIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const SELECTED_ADDRESS_KEY = 'fb_selected_address';
const LAST_KNOWN_LOCATION_KEY = 'fb_last_known_location';

const HOME_CUISINE_TABS = [
  { id: 'All', label: 'All', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&q=80' },
  { id: 'Pizza', label: 'Pizza', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&q=80' },
  { id: 'Burger', label: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&q=80' },
  { id: 'Indian', label: 'Thali', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=120&q=80' },
  { id: 'Chinese', label: 'Noodles', image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=120&q=80' },
  { id: 'Italian', label: 'Pasta', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=120&q=80' },
  { id: 'Japanese', label: 'Sushi', image: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=120&q=80' },
  { id: 'Mexican', label: 'Mexican', image: 'https://images.unsplash.com/photo-1617191519105-d07b98b10b88?w=120&q=80' },
  { id: 'Thai', label: 'Thai', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=120&q=80' },
  { id: 'Fast Food', label: 'Fast Food', image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=120&q=80' },
  { id: 'Desserts', label: 'Desserts', image: 'https://images.unsplash.com/photo-1505253216365-1dce1a8f94a5?w=120&q=80' },
  { id: 'Coffee', label: 'Drinks', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&q=80' },
];

const mapSavedAddressToSelection = (addr) => {
  const lng = Number(addr?.coordinates?.[0] ?? addr?.lng);
  const lat = Number(addr?.coordinates?.[1] ?? addr?.lat);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  if (!hasCoords) return null;

  return {
    id: addr._id,
    type: addr.type || 'other',
    typeLabel: addr.type === 'home' ? 'Home' : addr.type === 'work' ? 'Work' : 'Other',
    city: addr.city || '',
    fullAddress:
      addr.fullAddress ||
      [addr.street, addr.landmark, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    latitude: lat,
    longitude: lng,
  };
};

const getItemRestaurantId = (item) => String(item?.restaurantId || item?.restaurant?._id || '');

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { restaurants, loading } = useSelector((s) => s.restaurant);
  const { items: cartItems, restaurant: cartRestaurant } = useSelector((s) => s.cart);
  const { selectedDeliveryAddress } = useSelector((s) => s.ui);
  const { isAuthenticated } = useSelector((s) => s.auth);
  const { t, language, openLanguageModal } = useLanguage();

  const getLocalizedItemName = useCallback((item) => {
    const english = typeof item?.name === 'string' ? item.name : '';
    const hindi = typeof item?.nameHi === 'string' ? item.nameHi.trim() : '';
    return language === 'hi' && hindi ? hindi : english;
  }, [language]);

  const getLocalizedItemDescription = useCallback((item) => {
    const english = typeof item?.description === 'string' ? item.description : '';
    const hindi = typeof item?.descriptionHi === 'string' ? item.descriptionHi.trim() : '';
    return language === 'hi' && hindi ? hindi : english;
  }, [language]);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState({ restaurants: [], items: [] });
  const [categoryMenuItems, setCategoryMenuItems] = useState([]);
  const [categoryItemsLoading, setCategoryItemsLoading] = useState(false);
  const [trendingMenuItems, setTrendingMenuItems] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const searchBoxRef = useRef(null);
  const lastLocationErrorToastAtRef = useRef(0);

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const featuredRestaurants = useMemo(() => {
    return Array.isArray(restaurants) ? restaurants : [];
  }, [restaurants]);

  const nearbyRestaurantIds = useMemo(
    () => new Set((restaurants || []).map((r) => String(r?._id || '')).filter(Boolean)),
    [restaurants]
  );

  const nearbyRestaurantsById = useMemo(
    () => new Map((restaurants || []).map((r) => [String(r?._id || ''), r])),
    [restaurants]
  );

  const loadSavedAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedAddresses([]);
      return;
    }

    try {
      const res = await getAddresses();
      const addrs = res?.data?.addresses || [];
      setSavedAddresses(addrs);
    } catch {
      setSavedAddresses([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openLocation') !== '1') return;

    setShowAddressPicker(true);
    params.delete('openLocation');
    const nextSearch = params.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELECTED_ADDRESS_KEY);
      if (!selectedDeliveryAddress && saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          dispatch(setSelectedDeliveryAddress(parsed));
        }
      }
    } catch {
      // ignore bad persisted data
    }
  }, [dispatch, selectedDeliveryAddress]);

  useEffect(() => {
    if (!selectedDeliveryAddress) {
      setShowAddressPicker(true);
      return;
    }

    localStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(selectedDeliveryAddress));

    const lat = Number(selectedDeliveryAddress.latitude || 0);
    const lng = Number(selectedDeliveryAddress.longitude || 0);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

    if (!hasCoords) return;

    dispatch(fetchRestaurants({ lat, lng, radius: 50000, limit: 50 }));
  }, [dispatch, selectedDeliveryAddress]);

  const handleUseCurrentLocation = () => {
    const showLocationErrorToast = (message) => {
      const now = Date.now();
      // Avoid spamming repeated geolocation errors from transient iOS failures.
      if (now - lastLocationErrorToastAtRef.current < 8000) return;
      lastLocationErrorToastAtRef.current = now;
      toast.error(message);
    };

    const useSavedAddressFallback = () => {
      const fallback = (savedAddresses || [])
        .map((addr) => mapSavedAddressToSelection(addr))
        .find(Boolean);

      if (!fallback) return false;

      dispatch(setSelectedDeliveryAddress(fallback));
      setShowAddressPicker(false);
      toast(t('home.usingSavedFallback', 'GPS unavailable. Using your saved address instead.'));
      return true;
    };

    const getPosition = (options) => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

    const getLocationErrorMessage = (error) => {
      if (!window.isSecureContext) {
        return 'Location access requires HTTPS (or localhost). Please use address search instead.';
      }

      if (error?.code === 1) {
        return 'Location permission is blocked. Please allow location access and try again.';
      }

      if (error?.code === 2) {
        return 'Location signal is unavailable right now. Please move to open sky or use address search.';
      }

      if (error?.code === 3) {
        return 'Location request timed out. Please try again or use address search.';
      }

      return 'Unable to detect your location. Please use address search.';
    };

    setDetectingLocation(true);

    const onSuccess = (position) => {
      const latitude = Number(position?.coords?.latitude || 0);
      const longitude = Number(position?.coords?.longitude || 0);
      setDetectingLocation(false);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
        toast.error('Could not detect your current location.');
        return;
      }

      try {
        localStorage.setItem(
          LAST_KNOWN_LOCATION_KEY,
          JSON.stringify({ latitude, longitude, updatedAt: Date.now() })
        );
      } catch {
        // ignore storage issues
      }

      dispatch(
        setSelectedDeliveryAddress({
          id: 'current-location',
          type: 'current',
          typeLabel: 'Current',
          city: 'Current Area',
          fullAddress: `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          latitude,
          longitude,
        })
      );

      setShowAddressPicker(false);
    };

    const useLastKnownLocation = () => {
      try {
        const raw = localStorage.getItem(LAST_KNOWN_LOCATION_KEY);
        if (!raw) return false;

        const parsed = JSON.parse(raw);
        const latitude = Number(parsed?.latitude || 0);
        const longitude = Number(parsed?.longitude || 0);
        const updatedAt = Number(parsed?.updatedAt || 0);
        const maxAgeMs = 24 * 60 * 60 * 1000;

        const hasValidCoords = Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0);
        const isFreshEnough = Number.isFinite(updatedAt) && Date.now() - updatedAt <= maxAgeMs;

        if (!hasValidCoords || !isFreshEnough) return false;

        dispatch(
          setSelectedDeliveryAddress({
            id: 'last-known-location',
            type: 'current',
            typeLabel: 'Current',
            city: 'Nearby Area',
            fullAddress: `Last known location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            latitude,
            longitude,
          })
        );

        setShowAddressPicker(false);
        toast(t('home.usingLastKnown', 'Using your last known location.'));
        return true;
      } catch {
        return false;
      }
    };

    if (!navigator.geolocation) {
      setDetectingLocation(false);
      if (useSavedAddressFallback()) return;
      showLocationErrorToast('Location services are not supported.');
      return;
    }

    const getPositionWithRetries = async (options, retries = 0) => {
      let attempt = 0;
      let lastError;

      while (attempt <= retries) {
        try {
          return await getPosition(options);
        } catch (error) {
          lastError = error;
          // kCLErrorLocationUnknown on iOS is often transient; retry quickly.
          if (error?.code !== 2 || attempt === retries) break;
          await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 400));
          attempt += 1;
        }
      }

      throw lastError;
    };

    (async () => {
      try {
        const highAccuracyPosition = await getPositionWithRetries({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 120000,
        }, 2);
        onSuccess(highAccuracyPosition);
      } catch (highAccuracyError) {
        try {
          const fallbackPosition = await getPositionWithRetries({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          }, 1);
          onSuccess(fallbackPosition);
        } catch (fallbackError) {
          setDetectingLocation(false);

          if (useLastKnownLocation()) {
            return;
          }

          if (useSavedAddressFallback()) {
            return;
          }

          setShowAddressPicker(true);
          showLocationErrorToast(getLocationErrorMessage(fallbackError || highAccuracyError));
        }
      }
    })();
  };

  const handleSelectSavedAddress = (addr) => {
    const mapped = mapSavedAddressToSelection(addr);
    if (!mapped) {
      toast.error('This address is missing coordinates. Please re-add it.');
      return;
    }
    dispatch(setSelectedDeliveryAddress(mapped));
    setShowAddressPicker(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      setShowSuggestions(false);
      navigate(`/restaurants?search=${encodeURIComponent(searchQ.trim())}`);
    }
  };

  useEffect(() => {
    const query = searchQ.trim();
    if (query.length < 2) {
      setSearchSuggestions({ restaurants: [], items: [] });
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await searchRestaurantsAndItems({ q: query, limit: 30 });
        if (cancelled) return;
        const payload = response?.data || {};
        const restaurantsFromSearch = (payload?.restaurants || []).filter((r) => {
          const id = String(r?._id || '');
          return !nearbyRestaurantIds.size || nearbyRestaurantIds.has(id);
        });
        const itemsFromSearch = (payload?.items || []).filter((item) => {
          const rid = getItemRestaurantId(item);
          return !nearbyRestaurantIds.size || nearbyRestaurantIds.has(rid);
        });

        setSearchSuggestions({
          restaurants: restaurantsFromSearch.slice(0, 6),
          items: itemsFromSearch.slice(0, 8),
        });
      } catch {
        if (!cancelled) setSearchSuggestions({ restaurants: [], items: [] });
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQ, nearbyRestaurantIds]);

  useEffect(() => {
    if (activeFilter === 'All') {
      setCategoryMenuItems([]);
      setCategoryItemsLoading(false);
      return;
    }

    let cancelled = false;
    const loadCategoryItems = async () => {
      setCategoryItemsLoading(true);
      try {
        const response = await searchRestaurantsAndItems({ q: activeFilter, limit: 50 });
        if (cancelled) return;
        const payload = response?.data || {};
        const items = (payload?.items || [])
          .filter((item) => {
            const rid = getItemRestaurantId(item);
            return !nearbyRestaurantIds.size || nearbyRestaurantIds.has(rid);
          })
          .slice(0, 12);
        setCategoryMenuItems(items);
      } catch {
        if (!cancelled) setCategoryMenuItems([]);
      } finally {
        if (!cancelled) setCategoryItemsLoading(false);
      }
    };

    loadCategoryItems();
    return () => {
      cancelled = true;
    };
  }, [activeFilter, nearbyRestaurantIds]);

  useEffect(() => {
    if (!restaurants || restaurants.length === 0) {
      setTrendingMenuItems([]);
      setTrendingLoading(false);
      return;
    }

    let cancelled = false;
    const loadTrendingItems = async () => {
      setTrendingLoading(true);
      try {
        const topRestaurants = restaurants.slice(0, 8);
        const results = await Promise.all(
          topRestaurants.map(async (restaurant) => {
            try {
              const response = await getRestaurantMenuItems(restaurant._id, { limit: 20 });
              const items = response?.data?.items || [];
              return items.map((item) => ({
                ...item,
                restaurantId: restaurant._id,
                restaurantName: restaurant.name,
                restaurantImage: restaurant.image,
              }));
            } catch {
              return [];
            }
          })
        );

        if (cancelled) return;

        const allItems = results
          .flat()
          .filter((item) => item && item.name)
          .filter((item) => item.isAvailable !== false);

        const scored = allItems
          .map((item) => {
            const popularity = Number(item.orderCount || item.totalOrders || item.soldCount || 0);
            const rating = Number(item.rating || 0);
            const bonus = item.isPopular ? 15 : 0;
            return { item, score: popularity * 3 + rating * 10 + bonus };
          })
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.item);

        const diversified = [];
        const seenRestaurants = new Set();
        for (const item of scored) {
          const rid = getItemRestaurantId(item);
          if (!rid || seenRestaurants.has(rid)) continue;
          seenRestaurants.add(rid);
          diversified.push(item);
        }

        setTrendingMenuItems(diversified.slice(0, 10));
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    };

    loadTrendingItems();
    return () => {
      cancelled = true;
    };
  }, [restaurants]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNavActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const confirmCartReplacement = useCallback(async (nextRestaurantName) => {
    const result = await Swal.fire({
      title: t('home.replaceCartTitle', 'Replace cart item?'),
      text: t('home.replaceCartText', 'Your cart contains dishes from {current}. Do you want to discard the selection and add dishes from {next}?')
        .replace('{current}', cartRestaurant?.name || 'another restaurant')
        .replace('{next}', nextRestaurantName || 'this restaurant'),
      showCancelButton: true,
      showCloseButton: true,
      buttonsStyling: false,
      backdrop: 'rgba(17, 24, 39, 0.58)',
      confirmButtonText: t('home.yes', 'Yes'),
      cancelButtonText: t('home.no', 'No'),
      reverseButtons: true,
      customClass: {
        popup: 'cart-replace-popup',
        title: 'cart-replace-title',
        htmlContainer: 'cart-replace-text',
        actions: 'cart-replace-actions',
        confirmButton: 'cart-replace-yes',
        cancelButton: 'cart-replace-no',
        closeButton: 'cart-replace-close',
      },
    });
    return result.isConfirmed;
  }, [cartRestaurant?.name]);

  const handleTrendingAdd = useCallback(async (dish, restaurantId) => {
    if (!restaurantId) return;

    const restaurant = nearbyRestaurantsById.get(String(restaurantId)) || {
      _id: String(restaurantId),
      name: dish.restaurantName || 'Restaurant',
      image: dish.restaurantImage,
    };

    const hasOtherRestaurantItems = cartItems.length > 0
      && cartRestaurant
      && cartRestaurant._id !== restaurant._id;

    if (hasOtherRestaurantItems) {
      const confirmed = await confirmCartReplacement(restaurant.name);
      if (!confirmed) return;
      dispatch(clearCart());
    }

    dispatch(addToCart({ item: dish, restaurant }));
    toast.success(t('home.addedToCart', 'Added to cart!'));
    navigate(`/restaurant/${restaurant._id}`);
  }, [cartItems.length, cartRestaurant, confirmCartReplacement, dispatch, navigate, nearbyRestaurantsById]);

  return (
    <>
      <SEO
        title="Order Food Online – Best Restaurants Near You"
        description="Order food from curated restaurants near your selected location."
        url="/"
      />

      <div className="min-h-screen bg-[#F5F3F1]">
        <div className="max-w-md mx-auto px-4 pb-28 pt-[max(env(safe-area-inset-top),8px)] text-[13px]">
          <div className="flex items-center justify-between gap-3 mb-3 lg:hidden">
            <button type="button" onClick={() => setShowAddressPicker(true)} className="min-w-0 flex-1 flex items-center gap-2 text-left">
              <MapPinIcon className="h-4 w-4" style={{ color: BRAND }} />
              <div className="min-w-0">
                <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
                <p className="text-[12px] leading-none font-semibold text-gray-900 truncate">
                  {selectedDeliveryAddress?.city || t('home.selectLocationTitle', 'Select location')}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openLanguageModal}
                className="h-10 w-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700"
                aria-label="Change language"
                title="Change language"
              >
                <GlobeAltIcon className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => navigate('/restaurants')}>
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-700" />
              </button>
              <button type="button" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                <img src={logo} alt="Profile" className="h-full w-full object-cover" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative mb-4" ref={searchBoxRef}>
            <div className="rounded-full bg-[#E9E7E5] px-4 py-3 flex items-center gap-3">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQ}
                onFocus={() => setShowSuggestions(searchQ.trim().length >= 2)}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setShowSuggestions(e.target.value.trim().length >= 2);
                }}
                placeholder={t('home.searchCraving', 'Crave something delicious')}
                className="flex-1 bg-transparent text-[12px] text-gray-700 placeholder:text-gray-400 outline-none"
              />
            </div>

            {showSuggestions && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-[#E8E3DF] rounded-2xl shadow-xl z-30 overflow-hidden">
                {suggestionsLoading ? (
                  <div className="px-4 py-3 text-[12px] text-gray-500">{t('home.searching', 'Searching...')}</div>
                ) : searchSuggestions.restaurants.length === 0 && searchSuggestions.items.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-gray-500">{t('home.noMatches', 'No matching restaurants or menu items')}</div>
                ) : (
                  <>
                    {searchSuggestions.restaurants.map((r) => (
                      <button
                        key={`sr-${r._id}`}
                        type="button"
                        onMouseDown={() => {
                          setShowSuggestions(false);
                          navigate(`/restaurant/${r._id}`);
                        }}
                        className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                      >
                        <p className="text-[12px] font-semibold text-gray-900 line-clamp-1">{r.name}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{t('home.restaurant', 'Restaurant')}</p>
                      </button>
                    ))}

                    {searchSuggestions.items.map((item) => {
                      const rid = getItemRestaurantId(item);
                      if (!rid) return null;
                      return (
                        <button
                          key={`si-${item._id}`}
                          type="button"
                          onMouseDown={() => {
                            setShowSuggestions(false);
                            navigate(`/restaurant/${rid}`);
                          }}
                          className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                        >
                          <p className="text-[12px] font-semibold text-gray-900 line-clamp-1">{getLocalizedItemName(item)}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{item.restaurantName || t('home.menuItem', 'Menu item')}</p>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </form>

          <section className="mb-5">
            <div className="rounded-[30px] overflow-hidden relative min-h-[190px] p-5" style={{ background: 'linear-gradient(140deg, #1f2937, #374151)' }}>
              <img
                src="https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=700&q=80"
                alt="Offer"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="relative z-10">
                <p className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-2">{t('home.exclusiveOffer', 'Exclusive Offer')}</p>
                <h2 className="text-white text-[34px] leading-[0.92] font-black">50% OFF your first FlashBite</h2>
                <button className="mt-4 bg-[#FF5E1A] text-white px-6 py-2 rounded-full text-[12px] font-bold">{t('home.claimNow', 'Claim Now')}</button>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 max-[388px]:px-1 mb-6">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide py-3 max-[388px]:py-2">
              {HOME_CUISINE_TABS.map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className="flex-shrink-0 flex flex-col items-center px-3 py-2 max-[388px]:px-2.5 max-[388px]:py-1.5 rounded-2xl transition-all duration-200 min-w-[52px] max-[388px]:min-w-[46px]"
                    style={active ? { background: 'rgb(255, 240, 237)', color: 'rgb(234, 88, 12)' } : { color: 'rgb(156, 163, 175)' }}
                  >
                    <img
                      src={tab.image}
                      alt={tab.label}
                      className={`h-8 w-8 max-[388px]:h-7 max-[388px]:w-7 rounded-full object-cover ${active ? 'ring-2 ring-[#EA580C]' : 'ring-1 ring-black/5'}`}
                      loading="lazy"
                    />
                    <span
                      className="text-[11px] max-[388px]:text-[10px] font-semibold mt-1 whitespace-nowrap"
                      style={active ? { color: 'rgb(234, 88, 12)' } : { color: 'rgb(107, 114, 128)' }}
                    >
                      {tab.label}
                    </span>
                    {active && <span className="h-0.5 w-5 rounded-full mt-1" style={{ background: 'rgb(234, 88, 12)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {activeFilter !== 'All' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[25px] leading-[1.05] font-extrabold text-gray-900">{activeFilter} {t('home.itemsNearYou', 'Items Near You')}</h2>
                <span className="text-[11px] text-gray-500">{t('home.acrossNearby', 'Across nearby restaurants')}</span>
              </div>

              {categoryItemsLoading ? (
                <div className="py-8 text-center text-[12px] text-gray-500">{t('home.findingItems', 'Finding matching menu items...')}</div>
              ) : categoryMenuItems.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-gray-500">{t('home.noItems', 'No matching menu items found in this location.')}</div>
              ) : (
                <div className="space-y-3">
                  {categoryMenuItems.map((item) => {
                    const rid = getItemRestaurantId(item);
                    if (!rid) return null;
                    return (
                      <Link key={item._id} to={`/restaurant/${rid}`} className="block bg-white rounded-2xl border border-[#E8E3DF] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 line-clamp-1">{getLocalizedItemName(item)}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{item.restaurantName || t('home.restaurant', 'Restaurant')}</p>
                          </div>
                          <span className="text-[13px] font-extrabold text-[#FF5E1A]">₹{Number(item.price || 0).toFixed(2)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[25px] leading-[1.05] font-extrabold text-gray-900">{t('home.trendingDishes', 'Trending Dishes')}</h2>
              <span className="text-gray-400 text-[12px]">{t('home.popularNow', 'Popular now')}</span>
            </div>

            {trendingLoading ? (
              <div className="py-8 text-center text-[12px] text-gray-500">{t('home.loadingTrending', 'Loading trending dishes...')}</div>
            ) : trendingMenuItems.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-gray-500">{t('home.noTrending', 'No trending dishes available right now.')}</div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {trendingMenuItems.map((dish, index) => {
                  const restaurantId = getItemRestaurantId(dish);
                  const image =
                    dish.image ||
                    dish.imageUrl ||
                    (Array.isArray(dish.images) ? dish.images[0] : null) ||
                    dish.restaurantImage ||
                    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80';
                  const description = getLocalizedItemDescription(dish) || dish.category || dish.restaurantName || t('home.freshFavorite', 'Freshly made favorite');
                  const price = Number(dish.price || 0);

                  return (
                    <Link
                      key={dish._id || `${restaurantId}-${getLocalizedItemName(dish)}-${index}`}
                      to={restaurantId ? `/restaurant/${restaurantId}` : '/restaurants'}
                      className="bg-white rounded-[26px] p-3 min-w-[250px] border border-[#ECE9E7]"
                    >
                      <div className="h-28 rounded-[20px] overflow-hidden mb-2">
                        <img src={image} alt={getLocalizedItemName(dish)} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="text-[18px] leading-[1.05] font-extrabold text-gray-900">{getLocalizedItemName(dish)}</h4>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[#FF5E1A] text-lg font-bold">₹{price.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            await handleTrendingAdd(dish, restaurantId);
                          }}
                          className="h-8 w-8 rounded-full bg-[#FF5E1A] text-white text-sm"
                        >
                          +
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[25px] leading-[1.05] font-extrabold text-gray-900">{t('home.featuredNearYou', 'Featured Near You')}</h2>
                <p className="text-[12px] text-gray-500">{t('home.handpicked', 'Hand-picked by our local curators')}</p>
              </div>
              <Link to="/restaurants" className="text-[#EA580C] text-[12px] font-semibold">{t('home.viewAll', 'View All')}</Link>
            </div>

            {loading ? (
              <div className="py-10 text-center text-[12px] text-gray-500">{t('home.loadingRestaurants', 'Loading restaurants...')}</div>
            ) : featuredRestaurants.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-gray-500">{t('home.noRestaurants', 'No restaurants for this location yet.')}</div>
            ) : (
              <div className="space-y-5">
                {featuredRestaurants.map((r) => (
                  <Link key={r._id} to={`/restaurant/${r._id}`} className="block bg-white rounded-[22px] border border-[#E8E3DF] overflow-hidden">
                    <div className="relative h-52">
                      <img src={r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'} alt={r.name} className="w-full h-full object-cover" />
                      <div className="absolute right-3 top-3 bg-white rounded-full px-2 py-1 text-[10px] font-bold">★ {Number(r.rating || 4.7).toFixed(1)}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[25px] leading-[1.05] font-extrabold text-gray-900">{r.name}</h3>
                        <span className="text-[9px] font-semibold px-3 py-1 rounded-full bg-[#E7F4EE] text-[#2E8B67]">{t('home.freeDelivery', 'FREE DELIVERY')}</span>
                      </div>
                      <div className="text-[12px] text-gray-600 flex items-center gap-4">
                        <span>{String(r.deliveryTime || '25-35 min')}</span>
                        <span>{r.distance ? `${(r.distance * 1.60934).toFixed(1)} km` : '1.9 km'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>

        <button
          type="button"
          onClick={() => dispatch(openCart())}
          className="fixed right-5 bottom-[84px] z-50 h-14 w-14 rounded-full text-white flex items-center justify-center lg:hidden"
          style={{ background: '#FF5E1A', boxShadow: '0 8px 18px rgba(234,88,12,0.34)' }}
        >
          <ShoppingBagIcon className="h-6 w-6" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-[#EA580C] text-[8px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#E6E2DE] bg-[#F5F3F1]" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-6 pt-2 flex items-center justify-between text-[#B0ACA8]">
            <Link
              to="/"
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={isNavActive('/') ? { color: BRAND, background: '#FFF0ED' } : { color: '#B0ACA8' }}
            >
              <HomeIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('common.home', 'Home')}</span>
            </Link>
            <Link
              to="/restaurants"
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={isNavActive('/restaurants') ? { color: BRAND, background: '#FFF0ED' } : { color: '#B0ACA8' }}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('common.search', 'Search')}</span>
            </Link>
            <Link
              to="/orders"
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={isNavActive('/orders') ? { color: BRAND, background: '#FFF0ED' } : { color: '#B0ACA8' }}
            >
              <ShoppingBagIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('nav.orders', 'Orders')}</span>
            </Link>
            <Link
              to="/profile"
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={isNavActive('/profile') ? { color: BRAND, background: '#FFF0ED' } : { color: '#B0ACA8' }}
            >
              <UserCircleIcon className="h-5 w-5" />
              <span className="text-[8px]">{t('common.profile', 'Profile')}</span>
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {showAddressPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddressPicker(false)}
              className="fixed inset-0 z-[2000] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center px-4"
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden"
              >
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <p className="text-[8px] uppercase tracking-[0.24em] text-gray-400 font-semibold">{t('home.selectLocationTitle', 'Select your location')}</p>
                  <h2 className="text-[21px] leading-none font-black text-gray-900 mt-2">{t('home.whereDeliver', 'Where should we deliver?')}</h2>
                </div>

                <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={detectingLocation}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 hover:border-[#EA580C] hover:bg-orange-50 transition-colors text-left"
                  >
                    <div className="h-11 w-11 rounded-2xl bg-[#FFF0ED] flex items-center justify-center">
                      <MapPinIcon className="h-5 w-5" style={{ color: BRAND }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{detectingLocation ? t('home.detectingCurrent', 'Detecting current location...') : t('home.useCurrent', 'Use current location')}</p>
                      <p className="text-[10px] text-gray-500">{t('home.fastestNearby', 'Fastest way to find nearby restaurants')}</p>
                    </div>
                  </button>

                  {savedAddresses.map((addr) => (
                    <button
                      key={addr._id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 hover:border-[#EA580C] hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="h-11 w-11 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MapPinIcon className="h-5 w-5 text-gray-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{addr.fullAddress || addr.street || addr.city}</p>
                        <p className="text-[10px] text-gray-500 capitalize">{addr.type || t('home.savedAddress', 'saved address')}</p>
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressPicker(false);
                      setTimeout(() => setShowAddAddressModal(true), 100);
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-[12px] font-semibold text-[#EA580C] border border-[#F7D9CE] bg-[#FFF7F3]"
                  >
                    + {t('home.addNewAddress', 'Add new address')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onAddressAdded={(newAddress) => {
          if (!newAddress?._id) return;
          const mapped = mapSavedAddressToSelection(newAddress);
          if (mapped) {
            dispatch(setSelectedDeliveryAddress(mapped));
            setShowAddressPicker(false);
            setSavedAddresses((prev) => [newAddress, ...prev.filter((a) => a._id !== newAddress._id)]);
          }
        }}
      />
    </>
  );
};

export default Home;
