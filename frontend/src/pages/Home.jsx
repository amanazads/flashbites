import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../redux/slices/restaurantSlice';
import { getAddresses } from '../api/userApi';
import { getPlatformSettings } from '../api/settingsApi';
import { getRestaurantMenuItems, searchRestaurantsAndItems } from '../api/restaurantApi';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { Loader } from '../components/common/Loader';
import { calculateDistance } from '../utils/helpers';
import SEO from '../components/common/SEO';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FireIcon,
  MapPinIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const BRAND = '#E23744';
const ALL_CATEGORY_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&q=80';
const SEARCH_IMAGE = 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=120&q=80';
const LOCATION_BANNER_DISMISSED_KEY = 'fb_location_banner_dismissed';
const LOCATION_PERMISSION_STATE_KEY = 'fb_location_permission_state';
const SELECTED_ADDRESS_KEY = 'fb_selected_address';

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
    bg: 'linear-gradient(135deg, #E23744 0%, #C92535 100%)',
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

// Live location is intentionally disabled. Users select a delivery location manually.

/* Geocode a typed address/city string */
const geocodeAddress = async (query) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FlashBites/1.0 (info.flashbites@gmail.com)',
        'Accept-Language': 'en',
      },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon), displayName: data[0].display_name.split(',')[0] };
    }
    return null;
  } catch {
    return null;
  }
};

const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FlashBites/1.0 (info.flashbites@gmail.com)',
        'Accept-Language': 'en',
      },
    });
    const data = await res.json();
    const address = data?.address || {};
    const city = address.city || address.town || address.village || address.suburb || address.county || '';
    return {
      label: city || data?.display_name?.split(',')?.[0] || 'Current Location',
      city: city || data?.display_name?.split(',')?.[0] || 'Current Location',
    };
  } catch {
    return null;
  }
};

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { restaurants, loading, error: restaurantError } = useSelector((s) => s.restaurant);
  const { isAuthenticated } = useSelector((s) => s.auth);

  /* ── Delivery address state ── */
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [showGpsBanner] = useState(false);
  const pickerRef = useRef(null);
  const promoRowRef = useRef(null);
  const promoAutoTimerRef = useRef(null);
  const promoResetTimerRef = useRef(null);
  const promoIndexRef = useRef(0);

  /* ── Filtered restaurants ── */
  const [noServiceArea, setNoServiceArea] = useState(false);
  const [usedCityFallback, setUsedCityFallback] = useState(false);
  const [promoBanners, setPromoBanners] = useState([]);

  /* ── Category + search ── */
  const [activeCat, setActiveCat] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState({ restaurants: [], items: [] });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryMatchesByRestaurant, setCategoryMatchesByRestaurant] = useState({});
  const [categoryFilterLoading, setCategoryFilterLoading] = useState(false);
  const searchRef = useRef(null);

  // Wake up the backend, then fetch restaurants
  // On mobile (Capacitor) wait for health ping before fetching to avoid cold-start race
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform());

    const boot = async () => {
      try {
        await fetch(`${apiBase}/api/health`);
      } catch (_) { /* backend might be sleeping, that's fine */ }
      // Give it a moment to fully wake if it was sleeping
      if (isCapacitor) await new Promise(r => setTimeout(r, 1500));
      dispatch(fetchRestaurants({}));
    };

    boot();
  }, [dispatch]);

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
    if (isAuthenticated) {
      getAddresses().then((res) => {
        const addrs = res?.data?.addresses || [];
        setSavedAddresses(addrs);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // Restore selected address across page navigation
  useEffect(() => {
    try {
      const savedAddress = localStorage.getItem(SELECTED_ADDRESS_KEY);
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress);
        if (parsed && typeof parsed === 'object') {
          setSelectedAddress(parsed);
        }
      }
    } catch {
      // ignore invalid persisted state
    }
  }, []);

  // Persist selected address so returning to Home doesn't ask location again
  useEffect(() => {
    if (selectedAddress) {
      localStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(selectedAddress));
    }
  }, [selectedAddress]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowAddressPicker(false);
      }

      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        const response = await searchRestaurantsAndItems({ q: query, limit: 6 });
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

  // Live location disabled: no GPS prompt or auto-fill.

  useEffect(() => {
    if (!selectedAddress) {
      setNoServiceArea(false);
      setUsedCityFallback(false);
      return;
    }

    const lat = Number(selectedAddress.latitude || 0);
    const lng = Number(selectedAddress.longitude || 0);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

    if (hasCoords) {
      setUsedCityFallback(false);
      dispatch(fetchRestaurants({ lat, lng, radius: 50000 }));
    } else if (selectedAddress.city) {
      dispatch(fetchRestaurants({ city: selectedAddress.city }));
    }
  }, [selectedAddress, dispatch]);

  useEffect(() => {
    if (selectedAddress) {
      setNoServiceArea(restaurants.length === 0 && !loading);
    }
  }, [selectedAddress, restaurants, loading]);

  useEffect(() => {
    if (!selectedAddress || loading || usedCityFallback) return;
    const lat = Number(selectedAddress.latitude || 0);
    const lng = Number(selectedAddress.longitude || 0);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

    if (hasCoords && selectedAddress.city && restaurants.length === 0) {
      setUsedCityFallback(true);
      dispatch(fetchRestaurants({ city: selectedAddress.city }));
    }
  }, [selectedAddress, restaurants, loading, usedCityFallback, dispatch]);

  /* ── Select a saved address ── */
  const handleSelectSavedAddress = async (addr) => {
    setShowAddressPicker(false);

    const addrLng = Number(addr?.lng ?? addr?.coordinates?.[0]);
    const addrLat = Number(addr?.lat ?? addr?.coordinates?.[1]);
    const hasStoredCoords = Number.isFinite(addrLat) && Number.isFinite(addrLng) && (addrLat !== 0 || addrLng !== 0);

    let geo = null;
    if (!hasStoredCoords) {
      setGeocoding(true);
      // Fallback only when legacy address has no saved coordinates.
      geo = await geocodeAddress(addr.fullAddress || `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''}`);
      if (!geo && addr.city) geo = await geocodeAddress(addr.city);
      setGeocoding(false);
    }

    const cityLabel = addr.city;
    const typeLabel = addr.type === 'home' ? 'Home' : addr.type === 'work' ? 'Work' : 'Other';

    if (hasStoredCoords) {
      setSelectedAddress({
        id: addr._id,
        label: `${typeLabel} – ${cityLabel || addr.fullAddress || 'Saved Address'}`,
        city: cityLabel || '',
        latitude: addrLat,
        longitude: addrLng,
      });
      return;
    }

    if (geo) {
      setSelectedAddress({
        id: addr._id,
        label: `${typeLabel} – ${cityLabel || geo.displayName || 'Saved Address'}`,
        city: cityLabel || geo.displayName || '',
        latitude: geo.latitude,
        longitude: geo.longitude
      });
    } else {
      // No geocode — use cluster fallback with zeroed coords (city match will still work)
      setSelectedAddress({ id: addr._id, label: `${typeLabel} – ${cityLabel}`, city: cityLabel, latitude: 0, longitude: 0 });
      toast(`Showing restaurants near ${cityLabel || 'your selected area'}`, { icon: '📍' });
    }
  };

  /* ── Manual city / area geocode ── */
  const handleManualGeocode = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setGeocoding(true);
    setShowAddressPicker(false);
    const input = manualInput.trim();
    const geo = await geocodeAddress(input);
    setGeocoding(false);
    const cityLabel = (geo?.displayName || input);
    setSelectedAddress({
      label: cityLabel,
      city: cityLabel,
      latitude: geo?.latitude ?? 0,
      longitude: geo?.longitude ?? 0,
    });
    setManualInput('');
    if (!geo) toast(`Showing restaurants near "${input}"`, { icon: '📍' });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }

    setGpsLoading(true);
    setGpsDenied(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        const place = await reverseGeocode(latitude, longitude);

        setSelectedAddress({
          label: place?.label || 'Current Location',
          city: place?.city || 'Current Location',
          latitude,
          longitude,
        });
        setShowAddressPicker(false);
        setGpsLoading(false);
        toast.success('Using current location');
      },
      (error) => {
        setGpsLoading(false);
        if (error?.code === 1) {
          setGpsDenied(true);
          localStorage.setItem(LOCATION_PERMISSION_STATE_KEY, 'denied');
          toast.error('Location permission denied. You can still type a city manually.');
          return;
        }
        toast.error('Unable to fetch current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  const clearAddress = () => {
    setSelectedAddress(null);
    setNoServiceArea(false);
    localStorage.removeItem(SELECTED_ADDRESS_KEY);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      setShowSuggestions(false);
      navigate(`/restaurants?search=${encodeURIComponent(searchQ.trim())}`);
    }
  };

  const baseList = restaurants;
  const allFiltered = activeCat === 'all'
    ? baseList
    : baseList.filter((r) => Array.isArray(categoryMatchesByRestaurant[r._id]) && categoryMatchesByRestaurant[r._id].length > 0);
  const promosToShow = promoBanners.length > 0 ? promoBanners : PROMOS;
  const promoLoopItems = promosToShow.length > 1 ? [...promosToShow, promosToShow[0]] : promosToShow;

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
    <div className="page-wrapper flex justify-center lg:pt-10 max-[388px]:pt-4">
      <SEO
        title="Order Food Online – Best Restaurants Near You"
        description="Order fresh, hot food online from top restaurants near you. Fast delivery, exclusive restaurant deals, and 500+ menu options. FlashBites – India's fastest food delivery."
        url="/"
        keywords="food delivery, order food online, restaurant near me, online food order India, FlashBites, fast delivery food, food app India"
      />
      <div className="max-w-7xl mx-auto w-full max-[388px]:px-3">

      {/* ══════════════════════════════════
          DELIVERY ADDRESS SELECTOR
      ══════════════════════════════════ */}
      <div className="container-px pt-5 pb-3 max-[388px]:pt-3 max-[388px]:pb-2">
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowAddressPicker(!showAddressPicker)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl text-left transition-all max-[388px]:px-3 max-[388px]:py-3"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: showAddressPicker ? `1.5px solid ${BRAND}` : '1.5px solid transparent' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: selectedAddress ? '#FEF2F3' : '#F5F7FA' }}
            >
              {geocoding ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke={BRAND} strokeWidth="4" />
                  <path className="opacity-75" fill={BRAND} d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <MapPinIcon className="w-5 h-5" style={{ color: selectedAddress ? BRAND : '#9CA3AF' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 max-[388px]:text-[9px]">Deliver to</p>
              <p className="text-[14.5px] font-bold text-gray-900 truncate mt-0.5 max-[388px]:text-[13px]">
                {geocoding ? 'Finding location…' : selectedAddress ? selectedAddress.label : 'Select delivery location'}
              </p>
            </div>
            {selectedAddress ? (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); clearAddress(); }}
                onKeyDown={(e) => e.key === 'Enter' && clearAddress()}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-200"
                aria-label="Clear address"
              >
                <XMarkIcon className="w-4 h-4 text-gray-500" />
              </div>
            ) : (
              <ChevronDownIcon
                className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform"
                style={{ transform: showAddressPicker ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            )}
          </button>

          {/* Dropdown */}
          {showAddressPicker && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden z-50 animate-slide-down"
              style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}
            >
              {/* Manual input */}
              <form onSubmit={handleManualGeocode} className="p-4 border-b border-gray-100 max-[388px]:p-3">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl max-[388px]:px-2.5 max-[388px]:py-2"
                  style={{ background: '#F5F7FA', border: '1.5px solid transparent' }}
                >
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type city or area name…"
                    className="flex-1 bg-transparent outline-none text-[14px] font-medium text-gray-800 placeholder-gray-400 max-[388px]:text-[13px]"
                    autoFocus
                  />
                  {manualInput && (
                    <button
                      type="submit"
                      className="text-[12px] font-bold px-3 py-1 rounded-lg text-white flex-shrink-0 max-[388px]:px-2.5"
                      style={{ background: BRAND }}
                    >
                      Go
                    </button>
                  )}
                </div>
              </form>

              {/* Use current location */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {gpsLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={BRAND} strokeWidth="4" />
                      <path className="opacity-75" fill={BRAND} d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <MapPinIcon className="w-5 h-5" style={{ color: BRAND }} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-gray-800">Use current location</p>
                  <p className="text-[12px] text-gray-400">Detect automatically via GPS</p>
                </div>
              </button>

              {/* Browse all option */}
              <button
                onClick={() => { clearAddress(); setShowAddressPicker(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" className="w-5 h-5">
                    <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-gray-800">All Areas</p>
                  <p className="text-[12px] text-gray-400">Browse all restaurants</p>
                </div>
                {!selectedAddress && <CheckIcon className="w-4 h-4" style={{ color: BRAND }} />}
              </button>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <>
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Saved Addresses</p>
                  </div>
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr._id}
                      onClick={() => handleSelectSavedAddress(addr)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#FEF2F3' }}
                      >
                        <MapPinIcon className="w-4 h-4" style={{ color: BRAND }} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800">
                          <span className="capitalize">{addr.type}</span> – {addr.city}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{addr.street}</p>
                      </div>
                      <CheckIcon
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: BRAND, opacity: selectedAddress?.city === addr.city ? 1 : 0 }}
                      />
                    </button>
                  ))}
                </>
              )}

              {/* Add Address CTA — shown when logged in but no saved addresses */}
              {isAuthenticated && savedAddresses.length === 0 && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <p className="text-[12px] text-gray-500 mb-2">No saved addresses yet.</p>
                  <Link
                    to="/profile"
                    onClick={() => setShowAddressPicker(false)}
                    className="flex items-center gap-2 text-[13px] font-bold px-3 py-2 rounded-xl"
                    style={{ background: '#FEF2F3', color: BRAND }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                    </svg>
                    Add Delivery Address
                  </Link>
                </div>
              )}

              {/* Login nudge — for non-authenticated users */}
              {!isAuthenticated && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <p className="text-[12px] text-gray-400">
                    <Link to="/login" className="font-semibold" style={{ color: BRAND }}>Sign in</Link> to use your saved addresses
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════
          SEARCH BAR
      ══════════════════════════════════ */}
      <div className="container-px pb-5 lg:hidden max-[388px]:pb-3">
        <form onSubmit={handleSearch} ref={searchRef} className="relative">
          <div className="search-bar">
            <img
              src={SEARCH_IMAGE}
              alt=""
              className="h-5 w-5 rounded-full object-cover flex-shrink-0"
              loading="lazy"
            />
            <input
              type="text"
              value={searchQ}
              onFocus={() => setShowSuggestions(searchQ.trim().length >= 2)}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setShowSuggestions(e.target.value.trim().length >= 2);
              }}
              placeholder="Search for restaurants, dishes..."
            />
            {searchQ && (
              <button
                type="submit"
                className="flex-shrink-0 inline-flex items-center justify-center h-8 px-3 rounded-lg text-sm font-semibold leading-none max-[388px]:px-2 max-[388px]:text-xs"
                style={{ color: BRAND }}
              >
                Search
              </button>
            )}
          </div>

          {showSuggestions && (
            <div
              className="absolute left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden z-50"
              style={{ boxShadow: '0 12px 36px rgba(0,0,0,0.12)' }}
            >
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
      </div>

      {/* Promo banners — Figma style */}
      <div className="mb-6 container-px">
        <div className="snap-scroll-row" ref={promoRowRef}>
          {promoLoopItems.map((p, index) => (
            <Link
              key={`${p.id || p.tag || 'promo'}-${index}`}
              to="/restaurants"
              className="promo-banner snap-start flex-shrink-0 touch-feedback relative"
              style={{
                background: p.bg,
                width: 'clamp(230px, 78vw, 420px)',
                minWidth: '230px',
                minHeight: '135px',
                borderRadius: '20px',
              }}
            >
              <div className="flex-1 min-w-0 pr-2 z-10">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1.5">{p.tag}</p>
                <p className="text-white text-xl sm:text-2xl font-extrabold leading-tight mb-2 max-[388px]:text-lg" style={{ letterSpacing: '-0.02em' }}>{p.bold}</p>
                <p className="text-white/60 text-xs mb-3 line-clamp-2 max-[388px]:text-[11px]">{p.sub}</p>
                <button
                  className="text-white font-semibold text-sm px-5 py-2 rounded-xl max-[388px]:text-xs max-[388px]:px-4 max-[388px]:py-1.5"
                  style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)' }}
                >
                  {p.cta}
                </button>
              </div>
              <img
                src={p.img}
                alt=""
                className="h-24 w-24 xs:h-28 xs:w-28 object-cover rounded-2xl flex-shrink-0"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6 container-px">
        <div className="section-header">
          <h2 className="section-title max-[388px]:text-[16px]">Categories</h2>
          <Link to="/restaurants" className="section-link">See all</Link>
        </div>
        <div className="snap-scroll-row">
          {/* "All" pill */}
          <button
            onClick={() => setActiveCat('all')}
            className={`cat-card snap-start ${activeCat === 'all' ? 'active' : ''}`}
          >
            <img
              src={ALL_CATEGORY_IMAGE}
              alt="All"
              className={`h-8 w-8 rounded-full object-cover ${activeCat === 'all' ? 'ring-2 ring-white/90' : 'ring-1 ring-black/5'}`}
              loading="lazy"
            />
            <span className="text-xs font-semibold" style={activeCat === 'all' ? { color: 'white' } : { color: '#6B7280' }}>All</span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`cat-card snap-start ${activeCat === cat.id ? 'active' : ''}`}
            >
              <img
                src={cat.image}
                alt={cat.label}
                className={`h-8 w-8 rounded-full object-cover ${activeCat === cat.id ? 'ring-2 ring-white/90' : 'ring-1 ring-black/5'}`}
                loading="lazy"
              />
              <span className="text-xs font-semibold whitespace-nowrap" style={activeCat === cat.id ? { color: 'white' } : { color: '#6B7280' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured section */}
      {!loading && restaurants.length > 0 && (
        <div className="mb-6 container-px">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-1.5 max-[388px]:text-[16px]">
              <FireIcon className="h-5 w-5" style={{ color: BRAND }} />
              Featured
            </h2>
            <Link to="/restaurants" className="section-link">See all</Link>
          </div>
          <div className="snap-scroll-row">
            {restaurants.slice(0, 6).map((r) => (
              <Link
                key={r._id}
                to={`/restaurant/${r._id}`}
                className="snap-start flex-shrink-0 group"
              style={{ width: 'clamp(170px, 55vw, 260px)', minWidth: '170px' }}
              >
                <div className="card relative" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                  <div className="relative" style={{ height: '160px' }}>
                    <img
                      src={r.image || 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80'}
                      alt={r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 img-overlay" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="text-xs font-medium text-white/70">{r.cuisines?.[0] || 'Restaurant'}</p>
                      <p className="font-bold text-base leading-tight">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rating-badge text-xs py-0.5">⭐ {r.rating || '4.0'}</span>
                        <span className="text-xs text-white/70">{r.deliveryTime || '30'} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          NEARBY RESTAURANTS — full-width cards
      ══════════════════════════════════ */}
      <div className="container-px">
        <div className="section-header">
          <h2 className="section-title">
            {selectedAddress
              ? `${restaurants.length > 0 ? restaurants.length + ' Restaurants near ' : 'Restaurants near '} ${selectedAddress.city}`
              : 'All Restaurants'}
          </h2>
          <Link to="/restaurants" className="section-link flex items-center gap-1">
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {(loading || (activeCat !== 'all' && categoryFilterLoading)) ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke={BRAND} strokeWidth="4" />
              <path className="opacity-75" fill={BRAND} d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-[14px] font-semibold text-gray-500">
              {activeCat === 'all' ? 'Loading restaurants…' : `Finding ${activeCat} items across restaurants…`}
            </p>
            <p className="text-[12px] text-gray-400">
              {activeCat === 'all' ? 'This may take a moment on first load' : 'Checking menu items in available restaurants'}
            </p>
          </div>
        ) : restaurantError ? (
          /* ── Error / Retry state ── */
          <div
            className="text-center py-10 px-6 rounded-2xl"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: '#FEF2F3' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" className="w-8 h-8">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-1">Couldn't load restaurants</h3>
            <p className="text-[13px] text-gray-400 mb-5">The server may be waking up. Please try again.</p>
            <button
              onClick={() => dispatch(fetchRestaurants({}))}
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-[14px]"
              style={{ background: BRAND }}
            >
              Retry
            </button>
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
        ) : noServiceArea ? (
          /* ── Coming soon to this location ── */
          <div
            className="text-center py-10 px-6 rounded-2xl"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: '#FEF2F3' }}
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
            <p className="text-[13px] text-gray-400 max-w-xs mx-auto mb-5 leading-relaxed">
              We don't have restaurants delivering to <strong>{selectedAddress?.city}</strong> yet.
              FlashBites is expanding fast — we'll be there soon!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={clearAddress}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND}, #C92535)`, boxShadow: `0 4px 14px rgba(226,55,68,0.3)` }}
              >
                Browse All Restaurants
              </button>
              <a
                href="mailto:info.flashbites@gmail.com"
                className="text-[13px] font-semibold"
                style={{ color: BRAND }}
              >
                Notify me when available →
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: '#FEF2F3' }}
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
      </div>

      {/* ══════════════════════════════════
          APP DOWNLOAD CTA (from Figma)
      ══════════════════════════════════ */}
      <div className="hidden sm:block container-px mt-10 mb-6">
        <div className="app-download-section">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 relative z-10">
            Get the FlashBites app for better experience
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto relative z-10">
            Faster ordering, real-time tracking, and exclusive app-only deals delivered to your fingertips.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-10">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-all text-sm font-semibold">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2H6.477C5.662 2 5 2.662 5 3.477v17.046C5 21.338 5.662 22 6.477 22h11.046c.815 0 1.477-.662 1.477-1.477V3.477C19 2.662 18.338 2 17.523 2zM12 21a1 1 0 110-2 1 1 0 010 2zm5-3H7V4h10v14z"/></svg>
              App Store
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-all text-sm font-semibold">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.31 0 .6.1.84.27L17.35 10a1.5 1.5 0 010 4L5.34 21.73A1.5 1.5 0 013 20.5z"/></svg>
              Play Store
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          WHY FLASHBITES
      ══════════════════════════════════ */}
      <div className="px-4 mt-6 pb-4">
        <h2 className="section-title mb-4">Why FlashBites?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: '30 min',
              sub: 'Avg. delivery'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: '500+',
              sub: 'Restaurants'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: '4.8★',
              sub: 'Avg. rating'
            },
          ].map((f) => (
            <div key={f.title} className="card text-center py-4 px-2" style={{ borderRadius: '14px' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ background: '#FEF2F3', color: '#E23744' }}
              >
                {f.icon}
              </div>
              <p className="text-sm font-bold text-gray-900">{f.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{f.sub}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Home;