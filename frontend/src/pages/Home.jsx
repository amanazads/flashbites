import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants } from '../redux/slices/restaurantSlice';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { Loader } from '../components/common/Loader';
import { NEARBY_LOCATIONS } from '../utils/constants';
import { calculateDistance } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FireIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

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

/* ───── Promo banners ───── */
const PROMOS = [
  {
    id: 1,
    tag: 'On your first order',
    bold: '50% OFF',
    cta: 'Order Now',
    bg: '#1A1A1A',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=280&q=80',
  },
  {
    id: 2,
    tag: 'Orders above ₹199',
    bold: 'Free Delivery',
    cta: 'Order Now',
    bg: '#B30B33',
    img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=280&q=80',
  },
  {
    id: 3,
    tag: 'Late Night Special',
    bold: 'Meals < ₹250',
    cta: 'Explore',
    bg: '#2A2A2A',
    img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=280&q=80',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { restaurants, loading } = useSelector((s) => s.restaurant);
  const { location: geoLoc, loading: geoLoading, getLocation, clearLocation } = useGeolocation();
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyRests, setNearbyRests] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  // Fetch restaurants on mount
  useEffect(() => { dispatch(fetchRestaurants({})); }, [dispatch]);

  // Filter by location
  useEffect(() => {
    if (userLocation && restaurants.length) filterByDistance();
  }, [userLocation, restaurants]);

  const filterByDistance = () => {
    const MAX = 50;
    const list = restaurants
      .map((r) => {
        if (r.location?.coordinates?.length === 2) {
          const [lng, lat] = r.location.coordinates;
          return { ...r, distance: calculateDistance(userLocation.latitude, userLocation.longitude, lat, lng) };
        }
        return { ...r, distance: Infinity };
      })
      .filter((r) => r.distance <= MAX)
      .sort((a, b) => a.distance - b.distance);
    setNearbyRests(list);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/restaurants?search=${encodeURIComponent(searchQ.trim())}`);
  };

  const allFiltered = (() => {
    const base = userLocation && nearbyRests.length ? nearbyRests : restaurants;
    return activeCat === 'all' ? base : base.filter((r) => r.cuisines?.some((c) => c.toLowerCase() === activeCat.toLowerCase()));
  })();

  return (
    <div className="page-wrapper flex justify-center lg:pt-10">
      <div className="max-w-7xl mx-auto w-full">
      {/* ══════════════════════════════════
          SEARCH BAR (top, full-width)
      ══════════════════════════════════ */}
      <div className="container-px pt-6 pb-6 lg:hidden">
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
              <button type="submit" className="flex-shrink-0 text-sm font-semibold" style={{ color: '#B30B33' }}>
                Search
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Promo banners */}
      <div className="mb-6 container-px">
        <div className="snap-scroll-row">
          {PROMOS.map((p) => (
            <Link
              key={p.id}
              to="/restaurants"
              className="promo-banner snap-start flex-shrink-0 touch-feedback"
              style={{
                background: p.bg,
                width: 'clamp(240px, 76vw, 310px)',
                minWidth: '240px',
              }}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-white/80 text-xs font-medium mb-1 leading-tight">{p.tag}</p>
                <p className="text-white text-2xl font-extrabold leading-tight mb-3" style={{ letterSpacing: '-0.02em' }}>{p.bold}</p>
                <button
                  className="text-white font-semibold text-sm px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  {p.cta}
                </button>
              </div>
              <img
                src={p.img}
                alt=""
                className="h-24 w-24 object-cover rounded-2xl flex-shrink-0"
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
              style={activeCat === 'all' ? { color: '#B30B33' } : { color: '#9CA3AF' }}>
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/>
            </svg>
            <span className="text-xs font-semibold" style={activeCat === 'all' ? { color: '#B30B33' } : { color: '#6B7280' }}>All</span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`cat-card snap-start ${activeCat === cat.id ? 'active' : ''}`}
            >
              <span style={activeCat === cat.id ? { color: '#B30B33' } : { color: '#9CA3AF' }}>
                {cat.icon}
              </span>
              <span className="text-xs font-semibold whitespace-nowrap" style={activeCat === cat.id ? { color: '#B30B33' } : { color: '#6B7280' }}>
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
              <FireIcon className="h-5 w-5" style={{ color: '#B30B33' }} />
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
              style={{ width: 'clamp(220px, 55vw, 260px)', minWidth: '220px' }}
              >
                <div className="card relative" style={{ borderRadius: '20px', overflow: 'hidden' }}>
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
            {userLocation && nearbyRests.length > 0
              ? `${nearbyRests.length} Nearby Restaurants`
              : 'Popular Restaurants'}
          </h2>
          <Link to="/restaurants" className="section-link">See all</Link>
        </div>

        {loading ? (
          <Loader />
        ) : allFiltered.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {allFiltered.slice(0, 8).map((r) => (
              <RestaurantCard key={r._id} restaurant={r} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 animate-float">🍽️</div>
            <p className="text-gray-500 font-medium">No restaurants found</p>
            <button onClick={() => setActiveCat('all')} className="btn-primary mt-4 text-sm py-2 px-5">
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          WHY FLASHBITES
      ══════════════════════════════════ */}
      <div className="px-4 mt-8 pb-4">
        <h2 className="section-title mb-4">Why FlashBites?</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '⚡', title: '30 min', sub: 'Fast delivery' },
            { icon: '🍴', title: '500+', sub: 'Restaurants' },
            { icon: '💯', title: 'Top rated', sub: 'Quality assured' },
          ].map((f) => (
            <div key={f.title} className="card text-center py-4 px-2" style={{ borderRadius: '16px' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ background: '#fcf0f3' }}
              >
                <span className="text-xl">{f.icon}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{f.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{f.sub}</p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Home;