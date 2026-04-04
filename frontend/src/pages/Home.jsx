import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchRestaurants } from '../redux/slices/restaurantSlice';
import { openCart, setSelectedDeliveryAddress } from '../redux/slices/uiSlice';
import { getAddresses } from '../api/userApi';
import { getPlatformSettings } from '../api/settingsApi';
import { getRestaurantMenuItems, searchRestaurantsAndItems } from '../api/restaurantApi';
import { submitContactForm } from '../api/contactApi';
import AddAddressModal from '../components/common/AddAddressModal';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import LocationGateModal from '../components/location/LocationGateModal';
import { Loader } from '../components/common/Loader';
import { calculateCartTotal, calculateDistance } from '../utils/helpers';
import { formatCurrency } from '../utils/formatters';
import { BRAND } from '../constants/theme';
import SEO from '../components/common/SEO';
import { getApiBaseUrl } from '../utils/apiBase';
import { buildManualAddressSelection, mapSavedAddressToSelection } from '../utils/deliveryAddress';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ALL_CATEGORY_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&q=80';
/* ───── Category definitions with real food photos ───── */
const CATEGORIES = [
  { id: 'Pizza', label: 'Pizza', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&q=80' },
  { id: 'Burger', label: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&q=80' },
  { id: 'Paneer', label: 'Paneer', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=120&q=80' },
  { id: 'Cake', label: 'Cake', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=120&q=80' },
  { id: 'Biryani', label: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03246963d29d?w=120&q=80' },
  { id: 'Veg Meal', label: 'Veg Meal', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=120&q=80' },
  { id: 'North Indian', label: 'North Indian', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=120&q=80' },
  { id: 'Noodles', label: 'Noodles', image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=120&q=80' },
  { id: 'Sandwich', label: 'Sandwich', image: 'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=120&q=80' },
  { id: 'Dosa', label: 'Dosa', image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=120&q=80' },
  { id: 'Italian', label: 'Italian', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=120&q=80' },
  { id: 'Momos', label: 'Momos', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=120&q=80' },
  { id: 'Rice', label: 'Rice', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=120&q=80' },
  { id: 'Chaap', label: 'Chaap', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=120&q=80' },
  { id: 'Fries', label: 'Fries', image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=120&q=80' },
  { id: 'Shakes', label: 'Shakes', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&q=80' },
  { id: 'Coffee', label: 'Coffee', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&q=80' },
  { id: 'Desserts', label: 'Desserts', image: 'https://images.unsplash.com/photo-1505253216365-1dce1a8f94a5?w=120&q=80' },
  { id: 'Beverages', label: 'Drinks', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=120&q=80' },
  { id: 'Starters', label: 'Starters', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=120&q=80' },
];

/* ───── Promo banners (Figma-matched) ───── */
const PROMOS = [
  {
    id: 1,
    tag: 'LIMITED TIME',
    bold: '50% off your first 3 orders',
    sub: 'Use code WELCOME50 at checkout.',
    cta: 'Claim Offer',
    bg: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=280&q=80',
  },
  {
    id: 2,
    tag: 'FREE DELIVERY',
    bold: 'Free delivery on all orders',
    sub: 'No minimum limits. Just great food delivered.',
    cta: 'Order Now',
    bg: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=280&q=80',
  },
  {
    id: 3,
    tag: 'NIGHT SPECIAL',
    bold: 'Late night meals under ₹250',
    sub: 'Open late. Delivering hot until midnight.',
    cta: 'Explore Menu',
    bg: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
    img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=280&q=80',
  },
];

const DELIVERY_RADIUS_KM = 20;

/* Known city clusters: restaurants in the same cluster are shown together */
const KNOWN_CLUSTERS = [
  ['ataria', 'sidhauli', 'sitapur', 'kamlapur', 'misrikh', 'mahmudabad', 'biswan', 'hargaon', 'khairabad'],
];

const findCluster = (city = '') => {
  const c = city.toLowerCase().trim();
  return KNOWN_CLUSTERS.find(cl => cl.some(k => c.includes(k) || k.includes(c))) || null;
};

/* Returns true only if the restaurant has real (non-zero) GPS coordinates */
const hasRealCoords = (r) => {
  const coords = r.location?.coordinates;
  return Array.isArray(coords) && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0);
};

const buildRestaurantRequestKey = (filters = {}) => {
  const normalized = {
    lat: Number.isFinite(Number(filters?.lat)) ? Number(filters.lat) : null,
    lng: Number.isFinite(Number(filters?.lng)) ? Number(filters.lng) : null,
    radius: Number.isFinite(Number(filters?.radius)) ? Number(filters.radius) : null,
    city: String(filters?.city || '').trim().toLowerCase(),
    zipCode: String(filters?.zipCode || '').trim().toLowerCase(),
    state: String(filters?.state || '').trim().toLowerCase(),
    cuisine: String(filters?.cuisine || '').trim().toLowerCase(),
    search: String(filters?.search || '').trim().toLowerCase(),
  };

  return JSON.stringify(normalized);
};

const isNativePlatform = () => !!(
  typeof window !== 'undefined'
  && window.Capacitor
  && typeof window.Capacitor.isNativePlatform === 'function'
  && window.Capacitor.isNativePlatform()
);

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { restaurants, loading, error: restaurantError, lastResolvedRequestKey, activeRequestKey } = useSelector((s) => s.restaurant);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const selectedAddress = useSelector((s) => s.ui.selectedDeliveryAddress);
  const { items: cartItems } = useSelector((s) => s.cart);

  /* ── Delivery address state ── */
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showLocationGate, setShowLocationGate] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const promoRowRef = useRef(null);
  const promoAutoTimerRef = useRef(null);
  const promoResetTimerRef = useRef(null);
  const promoIndexRef = useRef(0);

  /* ── Filtered restaurants ── */
  const [noServiceArea, setNoServiceArea] = useState(false);
  const [promoBanners, setPromoBanners] = useState([]);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifyForm, setNotifyForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  /* ── Category + search ── */
  const [activeCat, setActiveCat] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState({ restaurants: [], items: [] });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryMatchesByRestaurant, setCategoryMatchesByRestaurant] = useState({});
  const [categoryFilterLoading, setCategoryFilterLoading] = useState(false);
  const searchRef = useRef(null);

  const loadSavedAddresses = useCallback(async () => {
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
  }, [isAuthenticated, selectedAddress, dispatch]);

  // Wake up the backend, then fetch restaurants
  // On mobile (Capacitor) wait for health ping before fetching to avoid cold-start race
  useEffect(() => {
    const apiBase = getApiBaseUrl().replace(/\/api\/?$/, '');
    const isCapacitor = isNativePlatform();

    const boot = async () => {
      try {
        await fetch(`${apiBase}/api/health`);
      } catch (_) { /* backend might be sleeping, that's fine */ }
      // Give it a moment to fully wake if it was sleeping
      if (isCapacitor) await new Promise(r => setTimeout(r, 1500));
      if (!selectedAddress) {
        dispatch(fetchRestaurants({}));
      }
    };

    boot();
  }, [dispatch, selectedAddress]);

  useEffect(() => {
    const loadPromos = async () => {
      try {
        const response = await getPlatformSettings();
        const settings = response?.data?.settings || null;
        const banners = Array.isArray(settings?.promoBanners) ? settings.promoBanners : [];
        const active = banners
          .filter((b) => b && b.isActive !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setPromoBanners(active);
      } catch {
        setPromoBanners([]);
      }
    };

    loadPromos();
  }, []);

  // Load saved addresses if authenticated
  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses]);

  useEffect(() => {
    setNotifyForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
  }, [user]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!addressesLoaded) return;
    setShowLocationGate(!selectedAddress);
  }, [addressesLoaded, selectedAddress]);

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
        const response = await searchRestaurantsAndItems({
          q: query,
          limit: 6,
          city: selectedAddress?.city || undefined,
        });
        const payload = response?.data || {};
        if (cancelled) return;

        let restaurantsFromSearch = payload?.restaurants || [];
        let itemsFromSearch = payload?.items || [];

        // Fallback: if backend search is unavailable/empty, derive suggestions locally.
        if (restaurantsFromSearch.length === 0 && itemsFromSearch.length === 0) {
          const queryLc = query.toLowerCase();
          const localRestaurantMatches = (restaurants || []).filter((r) => {
            const name = String(r?.name || '').toLowerCase();
            const cuisines = Array.isArray(r?.cuisines) ? r.cuisines.join(' ').toLowerCase() : '';
            return name.includes(queryLc) || cuisines.includes(queryLc);
          });

          const candidateRestaurants = (restaurants || []).filter((r) => r?._id).slice(0, 24);
          const menuSearchResults = await Promise.all(
            candidateRestaurants.map(async (restaurant) => {
              try {
                const menuResp = await getRestaurantMenuItems(restaurant._id, { search: query, limit: 20 });
                const menuItems = menuResp?.data?.items || [];
                return { restaurant, menuItems };
              } catch {
                return { restaurant, menuItems: [] };
              }
            })
          );

          const localItems = [];
          const localRestaurantMap = new Map(localRestaurantMatches.map((r) => [String(r._id), r]));

          menuSearchResults.forEach(({ restaurant, menuItems }) => {
            if (menuItems.length > 0) {
              localRestaurantMap.set(String(restaurant._id), restaurant);
              menuItems.forEach((item) => {
                localItems.push({
                  ...item,
                  restaurantId: restaurant._id,
                  restaurantName: restaurant.name,
                });
              });
            }
          });

          restaurantsFromSearch = Array.from(localRestaurantMap.values()).slice(0, 8);
          itemsFromSearch = localItems.slice(0, 10);
        }

        if (cancelled) return;

        setSearchSuggestions({
          restaurants: restaurantsFromSearch,
          items: itemsFromSearch
        });
      } catch {
        if (!cancelled) {
          const queryLc = query.toLowerCase();
          const fallbackRestaurants = (restaurants || []).filter((r) => {
            const name = String(r?.name || '').toLowerCase();
            const cuisines = Array.isArray(r?.cuisines) ? r.cuisines.join(' ').toLowerCase() : '';
            return name.includes(queryLc) || cuisines.includes(queryLc);
          }).slice(0, 8);

          setSearchSuggestions({ restaurants: fallbackRestaurants, items: [] });
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQ, restaurants]);

  // Location is selected manually from saved addresses or via current GPS.

  useEffect(() => {
    if (!selectedAddress) {
      setNoServiceArea(false);
      dispatch(fetchRestaurants({}));
      return;
    }

    const lat = Number(selectedAddress.latitude || 0);
    const lng = Number(selectedAddress.longitude || 0);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
    const city = String(selectedAddress.city || '').trim();
    const zipCode = String(selectedAddress.zipCode || '').trim();
    const state = String(selectedAddress.state || '').trim();

    if (!hasCoords) {
      toast.error('Please select a valid address from suggestions');
      return;
    }

    dispatch(fetchRestaurants({ lat, lng, radius: 50000, city, zipCode, state }));
  }, [selectedAddress, dispatch]);

  /* ── Select a saved address ── */
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
      setNoServiceArea(false);
      setShowLocationGate(false);
      toast.success('Current location selected');
    };

    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
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

  const handleOpenAddAddress = () => {
    setShowLocationGate(false);
    setTimeout(() => setShowAddAddressModal(true), 120);
  };

  const handleAddressAdded = (newAddress) => {
    if (!newAddress?._id) {
      toast.error('Address saved but could not select it. Please pick it from list.');
      loadSavedAddresses();
      return;
    }

    setSavedAddresses((prev) => {
      const filtered = prev.filter((addr) => addr._id !== newAddress._id);
      return [newAddress, ...filtered];
    });

    const mapped = mapSavedAddressToSelection(newAddress);
    if (mapped) {
      dispatch(setSelectedDeliveryAddress(mapped));
      setNoServiceArea(false);
      setShowLocationGate(false);
      return;
    }

    toast.error('Address added without valid coordinates. Please re-add from map suggestions.');
  };

  const openAddressSelector = () => {
    setShowLocationGate(true);
  };

  const handleManualAddressSelected = (selection) => {
    dispatch(setSelectedDeliveryAddress(selection));
    setNoServiceArea(false);
    setShowLocationGate(false);
  };

  const handleNotifyInterest = async () => {
    if (!selectedAddress) {
      toast.error('Select a delivery location first');
      return;
    }

    if (!notifyForm.name.trim() || !notifyForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setNotifySubmitting(true);
    try {
      const locationLabel = selectedAddress?.fullAddress || selectedAddress?.city || 'selected area';
      await submitContactForm({
        name: notifyForm.name.trim(),
        email: notifyForm.email.trim(),
        phone: notifyForm.phone.trim(),
        source: 'service-availability-request',
        subject: 'Service Availability Request',
        message: [
          'A user asked to be notified when FlashBites becomes available in this area.',
          '',
          `Requested location: ${locationLabel}`,
          `City: ${selectedAddress?.city || 'N/A'}`,
          `State: ${selectedAddress?.state || 'N/A'}`,
          `Zip Code: ${selectedAddress?.zipCode || 'N/A'}`,
          `Coordinates: ${selectedAddress?.latitude || 'N/A'}, ${selectedAddress?.longitude || 'N/A'}`
        ].join('\n')
      });
      toast.success("You're on the list. We'll notify you when we launch there.");
      setShowNotifyModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to register your request. Please try again.');
    } finally {
      setNotifySubmitting(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      setShowSuggestions(false);
      navigate(`/restaurants?search=${encodeURIComponent(searchQ.trim())}`);
    }
  };

  const selectedLat = Number(selectedAddress?.latitude || 0);
  const selectedLng = Number(selectedAddress?.longitude || 0);
  const hasSelectedCoords =
    Number.isFinite(selectedLat) &&
    Number.isFinite(selectedLng) &&
    (selectedLat !== 0 || selectedLng !== 0);

  const selectedAddressRequestKey = selectedAddress && hasSelectedCoords
    ? buildRestaurantRequestKey({
        lat: selectedLat,
        lng: selectedLng,
        radius: 50000,
        city: selectedAddress?.city || '',
        zipCode: selectedAddress?.zipCode || '',
        state: selectedAddress?.state || '',
      })
    : buildRestaurantRequestKey({});

  const isShowingResolvedRestaurants = !selectedAddress || lastResolvedRequestKey === selectedAddressRequestKey;
  const isResolvingSelectedAddress =
    !!selectedAddress &&
    activeRequestKey === selectedAddressRequestKey &&
    lastResolvedRequestKey !== selectedAddressRequestKey;
  const visibleRestaurants = isShowingResolvedRestaurants ? restaurants : [];
  const showComingSoonState =
    !!selectedAddress &&
    isShowingResolvedRestaurants &&
    !loading &&
    !restaurantError &&
    visibleRestaurants.length === 0;

  const baseList = visibleRestaurants;
  const allFiltered = activeCat === 'all'
    ? baseList
    : baseList.filter((r) => Array.isArray(categoryMatchesByRestaurant[r._id]) && categoryMatchesByRestaurant[r._id].length > 0);
  const promosToShow = promoBanners.length > 0 ? promoBanners : PROMOS;
  const promoLoopItems = promosToShow.length > 1 ? [...promosToShow, promosToShow[0]] : promosToShow;
  const cartItemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartTotal = calculateCartTotal(cartItems);
  const [cartExpanded, setCartExpanded] = useState(false);
  const greeting = new Date().getHours() >= 17 ? 'Good Evening' : 'Hello';
  const displayName = isAuthenticated ? (user?.name?.split(' ')[0] || 'Friend') : 'Guest';

  useEffect(() => {
    if (selectedAddress) {
      setNoServiceArea(isShowingResolvedRestaurants && restaurants.length === 0 && !loading);
    }
  }, [selectedAddress, restaurants, loading, isShowingResolvedRestaurants]);

  useEffect(() => {
    if (activeCat === 'all') {
      setCategoryMatchesByRestaurant({});
      setCategoryFilterLoading(false);
      return;
    }

    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      setCategoryMatchesByRestaurant({});
      setCategoryFilterLoading(false);
      return;
    }

    let cancelled = false;
    const fetchCategoryMatches = async () => {
      setCategoryFilterLoading(true);

      const availableRestaurants = restaurants
        .filter((r) => r && r._id);

      try {
        const responses = await Promise.all(
          availableRestaurants.map(async (restaurant) => {
            try {
              const data = await getRestaurantMenuItems(restaurant._id, { category: activeCat, limit: 50 });
              const items = data?.data?.items || [];
              return [restaurant._id, items];
            } catch {
              return [restaurant._id, []];
            }
          })
        );

        if (cancelled) return;

        const next = responses.reduce((acc, [restaurantId, items]) => {
          acc[restaurantId] = items;
          return acc;
        }, {});

        setCategoryMatchesByRestaurant(next);
      } finally {
        if (!cancelled) {
          setCategoryFilterLoading(false);
        }
      }
    };

    fetchCategoryMatches();

    return () => {
      cancelled = true;
    };
  }, [activeCat, restaurants]);

  useEffect(() => {
    const row = promoRowRef.current;
    if (!row || promosToShow.length < 2) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const getCards = () => row.querySelectorAll('.promo-banner');

    const scrollToCard = (index, behavior = 'smooth') => {
      const cards = getCards();
      if (!cards[index]) return;
      // Scroll only the promo row; avoid page-level auto scroll/jumps.
      row.scrollTo({
        left: cards[index].offsetLeft,
        behavior,
      });
    };

    const tick = () => {
      const cards = getCards();
      const realCount = promosToShow.length;
      if (cards.length < 2 || realCount < 2) return;

      const nextIndex = promoIndexRef.current + 1;
      scrollToCard(nextIndex, 'smooth');

      if (nextIndex === realCount) {
        if (promoResetTimerRef.current) clearTimeout(promoResetTimerRef.current);
        promoResetTimerRef.current = setTimeout(() => {
          promoIndexRef.current = 0;
          scrollToCard(0, 'auto');
        }, 420);
      } else {
        promoIndexRef.current = nextIndex;
      }
    };

    const start = () => {
      if (promoAutoTimerRef.current) clearInterval(promoAutoTimerRef.current);
      promoAutoTimerRef.current = setInterval(tick, 3200);
    };

    const stop = () => {
      if (promoAutoTimerRef.current) {
        clearInterval(promoAutoTimerRef.current);
        promoAutoTimerRef.current = null;
      }
    };

    const handleTouchStart = () => stop();
    const handleTouchEnd = () => start();

    row.addEventListener('touchstart', handleTouchStart, { passive: true });
    row.addEventListener('touchend', handleTouchEnd, { passive: true });
    row.addEventListener('mouseenter', stop);
    row.addEventListener('mouseleave', start);

    start();

    return () => {
      stop();
      if (promoResetTimerRef.current) {
        clearTimeout(promoResetTimerRef.current);
        promoResetTimerRef.current = null;
      }
      promoIndexRef.current = 0;
      row.removeEventListener('touchstart', handleTouchStart);
      row.removeEventListener('touchend', handleTouchEnd);
      row.removeEventListener('mouseenter', stop);
      row.removeEventListener('mouseleave', start);
    };
  }, [promosToShow.length]);

  return (
    <>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: '#F8FAFC',
          backgroundImage: 'none',
        }}
      >
        <SEO
          title="Order Food Online – Best Restaurants Near You"
          description="Order fresh, hot food online from top restaurants near you. Fast delivery, exclusive restaurant deals, and 500+ menu options. FlashBites – India's fastest food delivery."
          url="/"
          keywords="food delivery, order food online, restaurant near me, online food order India, FlashBites, fast delivery food, food app India"
        />

        <div className="max-w-7xl mx-auto px-4 pb-32 lg:pb-12">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative z-30 pt-[calc(var(--nav-height-mob)+env(safe-area-inset-top,0px)+10px)] lg:pt-8"
          >
            <div className="rounded-3xl border border-gray-200 p-4 sm:p-5 backdrop-blur-xl" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(250,250,250,0.92))', boxShadow: '0 4px 14px rgba(15,23,42,0.08)' }}>
              <p className="text-[13px] tracking-wide text-gray-500">{greeting},</p>
              <h1 className="text-gray-900 text-2xl sm:text-3xl font-black mt-1" style={{ letterSpacing: '-0.03em' }}>{displayName}</h1>

              <form onSubmit={handleSearch} ref={searchRef} className="relative mt-4">
                <div className="flex items-center gap-3 rounded-full border border-gray-200 px-4 py-3 bg-white focus-within:border-[#F97316] focus-within:shadow-[0_0_0_2px_rgba(255,122,0,0.14)] transition-all">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQ}
                    onFocus={() => setShowSuggestions(searchQ.trim().length >= 2)}
                    onChange={(e) => {
                      setSearchQ(e.target.value);
                      setShowSuggestions(e.target.value.trim().length >= 2);
                    }}
                    placeholder="Search food, restaurants, cuisines"
                    className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 text-sm outline-none"
                  />
                </div>

                {showSuggestions && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl overflow-hidden z-50 shadow-xl">
                    {suggestionsLoading ? (
                      <div className="px-4 py-3 text-[13px] text-gray-500">Searching...</div>
                    ) : (
                      <>
                        {searchSuggestions.restaurants.length === 0 && searchSuggestions.items.length === 0 ? (
                          <div className="px-4 py-3 text-[13px] text-gray-500">No related restaurants or items found</div>
                        ) : (
                          <>
                            {searchSuggestions.restaurants.slice(0, 4).map((restaurant) => (
                              <button
                                key={`rest-${restaurant._id}`}
                                type="button"
                                onMouseDown={() => {
                                  setShowSuggestions(false);
                                  navigate(`/restaurant/${restaurant._id}`);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                              >
                                <p className="text-[13px] font-semibold text-gray-900">{restaurant.name}</p>
                                <p className="text-[11px] text-gray-500">
                                  {Array.isArray(restaurant.cuisines) ? restaurant.cuisines.slice(0, 2).join(', ') : 'Restaurant'}
                                </p>
                              </button>
                            ))}

                            {searchSuggestions.items.slice(0, 6).map((item) => (
                              <button
                                key={`item-${item._id}`}
                                type="button"
                                onMouseDown={() => {
                                  setShowSuggestions(false);
                                  setSearchQ(item.name);
                                  navigate(`/restaurants?search=${encodeURIComponent(item.name)}`);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                              >
                                <p className="text-[13px] font-semibold text-gray-900">{item.name}</p>
                                <p className="text-[11px] text-gray-500">in {item.restaurantName || 'Restaurant'}</p>
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </form>

              <div className="relative z-[140] mt-4">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowLocationGate(true)}
                    className="min-w-0 flex-1 flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3.5 bg-white hover:border-orange-200 transition-colors overflow-hidden"
                  >
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-orange-50">
                      <MapPinIcon className="h-5 w-5 text-[#FB923C]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[11px] text-gray-500">Delivery Location</p>
                      <p className="text-[13px] text-gray-900 font-semibold truncate pr-1">
                        {selectedAddress ? selectedAddress.fullAddress : 'Select delivery location'}
                      </p>
                    </div>
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  </button>

                  {selectedAddress && (
                    <button
                      type="button"
                      onClick={openAddressSelector}
                      className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center justify-center"
                      aria-label="Change selected address"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          <section className="relative z-10 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 text-lg font-semibold">Categories</h2>
              <Link to="/restaurants" className="text-[#FB923C] text-sm">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {[{ id: 'all', label: 'All', image: ALL_CATEGORY_IMAGE }, ...CATEGORIES].map((cat) => {
                const active = activeCat === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCat(cat.id)}
                    className="flex-shrink-0 w-[82px]"
                  >
                    <div className="mx-auto h-14 w-14 rounded-full p-[2px]" style={{ background: active ? '#FB923C' : 'rgba(255,255,255,0.16)', boxShadow: 'none' }}>
                      <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                        <img src={cat.image} alt={cat.label} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-semibold truncate" style={{ color: active ? '#C2410C' : '#6B7280' }}>{cat.label}</p>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 text-lg font-semibold">
                {selectedAddress
                  ? `${visibleRestaurants.length > 0 ? `${visibleRestaurants.length} Restaurants near ` : 'Restaurants near '}${selectedAddress.city || 'selected address'}`
                  : 'All Restaurants'}
              </h2>
              <Link to="/restaurants" className="text-[#FB923C] text-sm">View all</Link>
            </div>

        {(loading || isResolvingSelectedAddress || (activeCat !== 'all' && categoryFilterLoading)) ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke={BRAND} strokeWidth="4" />
              <path className="opacity-75" fill={BRAND} d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-[14px] font-semibold text-gray-700">
              {activeCat === 'all' ? 'Loading restaurants…' : `Finding ${activeCat} items across restaurants…`}
            </p>
            <p className="text-[12px] text-gray-500">
              {activeCat === 'all' ? 'This may take a moment on first load' : 'Checking menu items in available restaurants'}
            </p>
          </div>
        ) : restaurantError ? (
          /* ── Error / Retry state ── */
          <div
            className="text-center py-10 px-6 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(255,122,0,0.14)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" className="w-8 h-8">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-1">Couldn't load restaurants</h3>
            <p className="text-[13px] text-gray-500 mb-5">
              {typeof restaurantError === 'string' && restaurantError.trim()
                ? restaurantError
                : 'The server may be waking up. Please try again.'}
            </p>
            <button
              onClick={() => {
                const lat = Number(selectedAddress?.latitude || 0);
                const lng = Number(selectedAddress?.longitude || 0);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
                if (!hasCoords) {
                  toast.error('Select a valid delivery address first');
                  return;
                }
                dispatch(fetchRestaurants({
                  lat,
                  lng,
                  radius: 50000,
                  city: selectedAddress?.city || undefined,
                }));
              }}
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-[14px]"
              style={{ background: BRAND }}
            >
              Retry
            </button>
          </div>
        ) : showComingSoonState ? (
          /* ── Coming soon to this location ── */
          <div
            className="text-center py-10 px-6 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(255,122,0,0.14)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" className="w-10 h-10">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3
              className="text-[20px] font-black text-gray-900 mb-2"
              style={{ letterSpacing: '-0.02em' }}
            >
              Coming Soon to {selectedAddress?.city || 'Your Area'}!
            </h3>
            <p className="text-[13px] text-gray-500 max-w-xs mx-auto mb-5 leading-relaxed">
              We don't have restaurants delivering to <strong>{selectedAddress?.city}</strong> yet.
              FlashBites is expanding fast — we'll be there soon!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  openAddressSelector();
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold text-white"
                style={{ background: BRAND, boxShadow: 'none' }}
              >
                Select Another Address
              </button>
              <button
                type="button"
                onClick={() => setShowNotifyModal(true)}
                className="text-[13px] font-semibold"
                style={{ color: BRAND }}
              >
                Notify me when available →
              </button>
            </div>
          </div>
        ) : allFiltered.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 xs:gap-4 sm:gap-5 lg:gap-6">
            {allFiltered.slice(0, 12).map((r) => (
              <RestaurantCard
                key={r._id}
                restaurant={r}
                selectedCategory={activeCat === 'all' ? null : activeCat}
                matchedItems={categoryMatchesByRestaurant[r._id] || []}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(255,122,0,0.14)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" className="w-7 h-7">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No restaurants found for this category</p>
            <button onClick={() => setActiveCat('all')} className="btn-primary mt-4 text-sm py-2 px-5">
              Clear filter
            </button>
          </div>
        )}
          </section>

          {cartItemCount > 0 && (
            <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 lg:hidden">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setCartExpanded((v) => !v)}
                className="w-full rounded-2xl px-4 py-3 text-white border border-orange-300"
                style={{ background: '#F97316', boxShadow: '0 2px 8px rgba(234,88,12,0.12)' }}
              >
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>🛒 {cartItemCount} Items</span>
                  <span>{formatCurrency(cartTotal)} →</span>
                </div>
              </motion.button>
              <AnimatePresence>
                {cartExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-2 rounded-2xl p-3 border border-gray-200"
                    style={{ background: 'rgba(255,255,255,0.98)' }}
                  >
                    <div className="flex gap-2">
                      <button onClick={() => dispatch(openCart())} className="flex-1 rounded-xl py-2 text-sm font-semibold bg-gray-100 text-gray-900">View Cart</button>
                      <button onClick={() => navigate('/checkout')} className="flex-1 rounded-xl py-2 text-sm font-semibold text-white" style={{ background: '#EA580C' }}>Checkout</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
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
        onOpenManualAddress={handleOpenAddAddress}
        onClose={() => setShowLocationGate(false)}
      />
      {showNotifyModal && (
        <div className="fixed inset-0 z-[1900] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Notify Me</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We&apos;ll save your request for <strong>{selectedAddress?.city || 'this area'}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close notify me dialog"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={notifyForm.name}
                  onChange={(e) => setNotifyForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={notifyForm.email}
                  onChange={(e) => setNotifyForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={notifyForm.phone}
                  onChange={(e) => setNotifyForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="+91..."
                />
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-gray-700">
                Location: {selectedAddress?.fullAddress || selectedAddress?.city || 'Selected area'}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNotifyModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNotifyInterest}
                  disabled={notifySubmitting}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                  style={{ background: BRAND }}
                >
                  {notifySubmitting ? 'Submitting...' : 'Notify Me'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
