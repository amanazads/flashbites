import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../redux/slices/restaurantSlice';
import { getAddresses } from '../api/userApi';
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
const LOCATION_BANNER_DISMISSED_KEY = 'fb_location_banner_dismissed';
const LOCATION_PERMISSION_STATE_KEY = 'fb_location_permission_state';
const SELECTED_ADDRESS_KEY = 'fb_selected_address';
/* ───── Category definitions with SVG icon paths ───── */
const CATEGORIES = [
  {
    id: 'Pizza', label: 'Pizza',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none"/>
        <circle cx="14" cy="14" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: 'Burger', label: 'Burgers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M3 11h18M3 14h18" strokeLinecap="round"/>
        <path d="M5 14v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>
        <path d="M5 11V9a7 7 0 0 1 14 0v2"/>
        <circle cx="8" cy="7" r="1" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none"/>
        <circle cx="16" cy="7" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: 'Indian', label: 'Thali',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <circle cx="12" cy="12" r="9"/>
        <path d="M9 12a3 3 0 0 0 6 0"/>
        <circle cx="8" cy="9.5" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="16" cy="9.5" r="1.5" fill="currentColor" stroke="none"/>
        <path d="M8 15h8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'Chinese', label: 'Noodles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M4 9c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v2H4V9z"/>
        <path d="M4 11v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>
        <path d="M9 5v2M12 4v3M15 5v2"/>
        <path d="M7 14h10" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'Fast Food', label: 'Fries',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M8 3v8M12 2v9M16 3v8"/>
        <path d="M6 11h12l-1 8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1l-1-8z"/>
      </svg>
    ),
  },
  {
    id: 'Desserts', label: 'Desserts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M12 2c-3 0-6 2-6 5v1h12V7c0-3-3-5-6-5z"/>
        <rect x="3" y="8" width="18" height="3" rx="1.5"/>
        <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/>
        <path d="M9 15h6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'Coffee', label: 'Drinks',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
        <path d="M6 2v2M10 2v2M14 2v2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'Salads', label: 'Salads',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M12 2C6 2 3 6 3 10c0 2 1 3.5 2 4.5S8 22 12 22s6-6 7-7.5S21 12 21 10c0-4-3-8-9-8z"/>
        <path d="M9 10c1-1.5 3-2 5-1" strokeLinecap="round"/>
        <path d="M8 14c1.5 1 4 1 6 0" strokeLinecap="round"/>
      </svg>
    ),
  },
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

/* Reverse-geocode lat/lng to city name using Nominatim */
const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FlashBites/1.0 (info.flashbites@gmail.com)',
        'Accept-Language': 'en',
      },
    });
    const data = await res.json();
    return (
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.address?.county ||
      data?.display_name?.split(',')[0] ||
      null
    );
  } catch {
    return null;
  }
};

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
  const [showGpsBanner, setShowGpsBanner] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(LOCATION_BANNER_DISMISSED_KEY) !== 'true';
  });
  const pickerRef = useRef(null);

  /* ── Filtered restaurants ── */
  const [nearbyRests, setNearbyRests] = useState([]);
  const [noServiceArea, setNoServiceArea] = useState(false);

  /* ── Category + search ── */
  const [activeCat, setActiveCat] = useState('all');
  const [searchQ, setSearchQ] = useState('');


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

  // Load saved addresses if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getAddresses().then((res) => {
        const addrs = res?.data?.addresses || [];
        setSavedAddresses(addrs);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // Restore selected address and permission/banner state across page navigation
  useEffect(() => {
    try {
      const savedAddress = localStorage.getItem(SELECTED_ADDRESS_KEY);
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress);
        if (parsed && typeof parsed === 'object') {
          setSelectedAddress(parsed);
        }
      }

      const permissionState = localStorage.getItem(LOCATION_PERMISSION_STATE_KEY);
      if (permissionState === 'granted' || permissionState === 'denied') {
        setShowGpsBanner(false);
      }
      if (permissionState === 'denied') {
        setGpsDenied(true);
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
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ─────────────────────────────────────────────
     GPS PERMISSION — request on mount, auto-fill
  ────────────────────────────────────────────── */
  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsDenied(true); return; }
    setGpsLoading(true);
    setShowGpsBanner(false);
    localStorage.setItem(LOCATION_BANNER_DISMISSED_KEY, 'true');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = await reverseGeocode(latitude, longitude);
        setGpsLoading(false);
        localStorage.setItem(LOCATION_PERMISSION_STATE_KEY, 'granted');
        if (city) {
          setSelectedAddress({ label: city, city, latitude, longitude, fromGps: true });
          toast.success(`Location detected: ${city}`);
        } else {
          // GPS coords obtained but city unknown — still use them for distance
          setSelectedAddress({ label: 'Current Location', city: '', latitude, longitude, fromGps: true });
          toast.success('Using your current location');
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsDenied(true);
        localStorage.setItem(LOCATION_PERMISSION_STATE_KEY, 'denied');
        if (err.code === 1) toast('Location permission denied. Use the address picker instead.', { icon: '📍' });
      },
      { timeout: 20000, maximumAge: 120000 }
    );
  }, []);

  /* ─────────────────────────────────────────────
     FILTER LOGIC  
     Priority:
       1. Real GPS coords (non-zero) → distance ≤ 20km
       2. Address has [0,0] coords  → skip distance, use city-name matching
       3. No address selected        → show all restaurants
  ────────────────────────────────────────────── */
  const filterByCoords = useCallback((lat, lng, cityLabel = '') => {
    const cluster = findCluster(cityLabel);
    const typedCity = cityLabel.toLowerCase().trim();
    const userHasGps = (lat !== 0 || lng !== 0);

    const withDist = restaurants.map((r) => {
      const rCity = (r.address?.city || '').toLowerCase().trim();

      // 1) Restaurant has real GPS → use precise distance
      if (hasRealCoords(r) && userHasGps) {
        const [rLng, rLat] = r.location.coordinates;
        return { ...r, distance: calculateDistance(lat, lng, rLat, rLng) };
      }

      // 2) Cluster match  (e.g. "Ataria" → shows Sidhauli/Sitapur cluster restaurants)
      if (cluster && rCity && cluster.some(k => rCity.includes(k) || k.includes(rCity))) {
        return { ...r, distance: 5 };
      }

      // 3) If user has real GPS but restaurant has [0,0] coords — match by city name
      if (userHasGps && typedCity && rCity &&
          (rCity.includes(typedCity) || typedCity.includes(rCity))) {
        return { ...r, distance: 10 };
      }

      // 4) Pure city-name substring match (for manually typed areas)
      if (typedCity && rCity &&
          (rCity.includes(typedCity) || typedCity.includes(rCity) ||
           typedCity.split(' ').some(w => w.length > 2 && rCity.includes(w)))) {
        return { ...r, distance: 10 };
      }

      return { ...r, distance: Infinity };
    });

    const nearby = withDist
      .filter(r => r.distance <= DELIVERY_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

    setNearbyRests(nearby);
    setNoServiceArea(nearby.length === 0);
  }, [restaurants]);

  useEffect(() => {
    if (selectedAddress && restaurants.length) {
      filterByCoords(selectedAddress.latitude, selectedAddress.longitude, selectedAddress.city);
    }
  }, [selectedAddress, restaurants, filterByCoords]);

  /* ── Select a saved address ── */
  const handleSelectSavedAddress = async (addr) => {
    setGeocoding(true);
    setShowAddressPicker(false);
    // Try full address first, then just city
    let geo = await geocodeAddress(`${addr.street}, ${addr.city}, ${addr.state}`);
    if (!geo) geo = await geocodeAddress(addr.city);
    setGeocoding(false);
    const cityLabel = addr.city;
    const typeLabel = addr.type === 'home' ? 'Home' : addr.type === 'work' ? 'Work' : 'Other';
    if (geo) {
      setSelectedAddress({ label: `${typeLabel} – ${cityLabel}`, city: cityLabel, latitude: geo.latitude, longitude: geo.longitude });
    } else {
      // No geocode — use cluster fallback with zeroed coords (city match will still work)
      setSelectedAddress({ label: `${typeLabel} – ${cityLabel}`, city: cityLabel, latitude: 0, longitude: 0 });
      toast(`Showing restaurants near ${cityLabel}`, { icon: '📍' });
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

  const clearAddress = () => {
    setSelectedAddress(null);
    setNearbyRests([]);
    setNoServiceArea(false);
    localStorage.removeItem(SELECTED_ADDRESS_KEY);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/restaurants?search=${encodeURIComponent(searchQ.trim())}`);
  };

  const baseList = selectedAddress ? nearbyRests : restaurants;
  const allFiltered = activeCat === 'all' ? baseList : baseList.filter((r) => r.cuisines?.some((c) => c.toLowerCase() === activeCat.toLowerCase()));

  return (
    <div className="page-wrapper flex justify-center lg:pt-10">
      <SEO
        title="Order Food Online – Best Restaurants Near You"
        description="Order fresh, hot food online from top restaurants near you. Fast delivery, exclusive restaurant deals, and 500+ menu options. FlashBites – India's fastest food delivery."
        url="/"
        keywords="food delivery, order food online, restaurant near me, online food order India, FlashBites, fast delivery food, food app India"
      />
      <div className="max-w-7xl mx-auto w-full">

      {/* ══════════════════════════════════
          DELIVERY ADDRESS SELECTOR
      ══════════════════════════════════ */}
      <div className="container-px pt-5 pb-3">
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowAddressPicker(!showAddressPicker)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl text-left transition-all"
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Deliver to</p>
              <p className="text-[14.5px] font-bold text-gray-900 truncate mt-0.5">
                {geocoding ? 'Finding location…' : selectedAddress ? selectedAddress.label : 'Select delivery address'}
              </p>
            </div>
            {selectedAddress ? (
              // ← div NOT button (fixes button-in-button DOM nesting error)
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
              <form onSubmit={handleManualGeocode} className="p-4 border-b border-gray-100">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: '#F5F7FA', border: '1.5px solid transparent' }}
                >
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type city or area name…"
                    className="flex-1 bg-transparent outline-none text-[14px] font-medium text-gray-800 placeholder-gray-400"
                    autoFocus
                  />
                  {manualInput && (
                    <button
                      type="submit"
                      className="text-[12px] font-bold px-3 py-1 rounded-lg text-white flex-shrink-0"
                      style={{ background: BRAND }}
                    >
                      Go
                    </button>
                  )}
                </div>
              </form>

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
          GPS PERMISSION BANNER
      ══════════════════════════════════ */}
      {!selectedAddress && !gpsLoading && showGpsBanner && !gpsDenied && (
        <div className="container-px pb-2">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #2D1515 100%)', boxShadow: '0 2px 12px rgba(226,55,68,0.15)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(226,55,68,0.25)' }}
            >
              <MapPinIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-bold leading-tight">Enable location access</p>
              <p className="text-white/50 text-[11px] mt-0.5">See restaurants near you</p>
            </div>
            <button
              onClick={requestGps}
              className="flex-shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-xl text-white"
              style={{ background: BRAND }}
            >
              Allow
            </button>
            <div
              role="button"
              tabIndex={0}
                onClick={() => {
                  setShowGpsBanner(false);
                  localStorage.setItem(LOCATION_BANNER_DISMISSED_KEY, 'true');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowGpsBanner(false);
                    localStorage.setItem(LOCATION_BANNER_DISMISSED_KEY, 'true');
                  }
                }}
              className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <XMarkIcon className="w-3.5 h-3.5 text-white/60" />
            </div>
          </div>
        </div>
      )}

      {/* GPS loading indicator */}
      {gpsLoading && (
        <div className="container-px pb-2">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#F5F7FA' }}
          >
            <svg className="animate-spin w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke={BRAND} strokeWidth="4" />
              <path className="opacity-75" fill={BRAND} d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-[13px] font-semibold text-gray-600">Detecting your location…</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          SEARCH BAR
      ══════════════════════════════════ */}
      <div className="container-px pb-5 lg:hidden">
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search for restaurants, dishes..."
            />
            {searchQ && (
              <button type="submit" className="flex-shrink-0 text-sm font-semibold" style={{ color: BRAND }}>
                Search
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Promo banners — Figma style */}
      <div className="mb-6 container-px">
        <div className="snap-scroll-row">
          {PROMOS.map((p) => (
            <Link
              key={p.id}
              to="/restaurants"
              className="promo-banner snap-start flex-shrink-0 touch-feedback relative"
              style={{
                background: p.bg,
                width: 'clamp(260px, 75vw, 420px)',
                minWidth: '260px',
                minHeight: '145px',
                borderRadius: '20px',
              }}
            >
              <div className="flex-1 min-w-0 pr-2 z-10">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1.5">{p.tag}</p>
                <p className="text-white text-xl sm:text-2xl font-extrabold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>{p.bold}</p>
                <p className="text-white/60 text-xs mb-3 line-clamp-2">{p.sub}</p>
                <button
                  className="text-white font-semibold text-sm px-5 py-2 rounded-xl"
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
          <h2 className="section-title">Categories</h2>
          <Link to="/restaurants" className="section-link">See all</Link>
        </div>
        <div className="snap-scroll-row">
          {/* "All" pill */}
          <button
            onClick={() => setActiveCat('all')}
            className={`cat-card snap-start ${activeCat === 'all' ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7"
              style={activeCat === 'all' ? { color: 'white' } : { color: '#9CA3AF' }}>
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/>
            </svg>
            <span className="text-xs font-semibold" style={activeCat === 'all' ? { color: 'white' } : { color: '#6B7280' }}>All</span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`cat-card snap-start ${activeCat === cat.id ? 'active' : ''}`}
            >
              <span style={activeCat === cat.id ? { color: 'white' } : { color: '#9CA3AF' }}>
                {cat.icon}
              </span>
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
            <h2 className="section-title flex items-center gap-1.5">
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
              style={{ width: 'clamp(190px, 48vw, 260px)', minWidth: '190px' }}
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
              ? `${nearbyRests.length > 0 ? nearbyRests.length + ' Restaurants near ' : 'Restaurants near '} ${selectedAddress.city}`
              : 'All Restaurants'}
          </h2>
          <Link to="/restaurants" className="section-link flex items-center gap-1">
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke={BRAND} strokeWidth="4" />
              <path className="opacity-75" fill={BRAND} d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-[14px] font-semibold text-gray-500">Loading restaurants…</p>
            <p className="text-[12px] text-gray-400">This may take a moment on first load</p>
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
              <RestaurantCard key={r._id} restaurant={r} />
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
      <div className="container-px mt-10 mb-6">
        <div className="app-download-section">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 relative z-10">
            Get the FlashBites app for better experience
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto relative z-10">
            Faster ordering, real-time tracking, and exclusive app-only deals delivered to your fingertips.
          </p>
          <div className="flex items-center justify-center gap-4 relative z-10">
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-all text-sm font-semibold">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2H6.477C5.662 2 5 2.662 5 3.477v17.046C5 21.338 5.662 22 6.477 22h11.046c.815 0 1.477-.662 1.477-1.477V3.477C19 2.662 18.338 2 17.523 2zM12 21a1 1 0 110-2 1 1 0 010 2zm5-3H7V4h10v14z"/></svg>
              App Store
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-all text-sm font-semibold">
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
        <div className="grid grid-cols-3 gap-3">
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