import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchRestaurants, setFilters } from '../redux/slices/restaurantSlice';
import { openCart } from '../redux/slices/uiSlice';
import { getNearbyRestaurants, searchRestaurantsAndItems } from '../api/restaurantApi';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { Loader } from '../components/common/Loader';
import { CUISINES } from '../utils/constants';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ShoppingBagIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { BRAND } from '../constants/theme';
import logo from '../assets/logo.png';
import { useLanguage } from '../contexts/LanguageContext';

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

const RestaurantPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { restaurants, loading, filters } = useSelector((s) => s.restaurant);
  const selectedAddress = useSelector((s) => s.ui.selectedDeliveryAddress);
  const { items: cartItems } = useSelector((s) => s.cart);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [searchResultRestaurants, setSearchResultRestaurants] = useState([]);
  const [searchResultItems, setSearchResultItems] = useState([]);
  const [searchMatchedItemsByRestaurant, setSearchMatchedItemsByRestaurant] = useState({});
  const [searchLoading, setSearchLoading] = useState(false);
  const routerLocation = useLocation();
  const { t } = useLanguage();
  const params = new URLSearchParams(routerLocation.search);
  const searchQuery = params.get('search')?.trim() || '';
  const cuisineQuery = params.get('cuisine')?.trim() || '';
  const inSearchMode = searchQuery.length > 0;
  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchInputRef = useRef(null);
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const isNavActive = (path) => {
    if (path === '/') return routerLocation.pathname === '/';
    return routerLocation.pathname.startsWith(path);
  };

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

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
        const lat = Number(selectedAddress?.latitude || 0);
        const lng = Number(selectedAddress?.longitude || 0);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

        let nearbyIds = null;
        let nearbyRestaurantMap = new Map();

        if (hasCoords) {
          const nearbyResponse = await getNearbyRestaurants(lat, lng, 50000, 250);
          const nearbyRestaurants = nearbyResponse?.data?.restaurants || nearbyResponse?.restaurants || [];
          nearbyIds = new Set(nearbyRestaurants.map((r) => String(r?._id || '')).filter(Boolean));
          nearbyRestaurantMap = new Map(nearbyRestaurants.map((r) => [String(r?._id || ''), r]));
        }

        const response = await searchRestaurantsAndItems({ q: searchQuery, limit: 30 });
        const payload = response?.data || {};
        if (cancelled) return;

        const searchedRestaurants = payload?.restaurants || [];
        const searchedItems = payload?.items || [];

        const locationFilteredRestaurants = nearbyIds
          ? searchedRestaurants.filter((r) => nearbyIds.has(String(r?._id || '')))
          : searchedRestaurants;

        const locationFilteredItems = nearbyIds
          ? searchedItems.filter((item) => nearbyIds.has(String(item?.restaurantId || '')))
          : searchedItems;

        const restaurantMap = new Map(locationFilteredRestaurants.map((r) => [String(r._id), r]));
        const matchesByRestaurant = {};

        locationFilteredItems.forEach((item) => {
          const rid = String(item.restaurantId || '');
          if (!rid) return;

          if (!restaurantMap.has(rid)) {
            const fallbackRestaurant = nearbyRestaurantMap.get(rid);
            if (fallbackRestaurant) {
              restaurantMap.set(rid, fallbackRestaurant);
            } else {
              restaurantMap.set(rid, {
                _id: rid,
                name: item.restaurantName || 'Restaurant',
                cuisines: [],
                image: null,
              });
            }
          }

          if (!Array.isArray(matchesByRestaurant[rid])) {
            matchesByRestaurant[rid] = [];
          }
          matchesByRestaurant[rid].push(item);
        });

        setSearchResultItems(locationFilteredItems);
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
  }, [dispatch, inSearchMode, searchQuery, filters.search, selectedAddress]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) {
      navigate('/restaurants');
      return;
    }
    navigate(`/restaurants?search=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    if (inSearchMode) return;

    const nextCuisine = cuisineQuery || 'All';
    setSelectedCuisine(nextCuisine);
    dispatch(setFilters({ cuisine: cuisineQuery || null, search: '' }));
  }, [dispatch, inSearchMode, cuisineQuery]);

  useEffect(() => {
    if (inSearchMode) return;

    const lat = Number(selectedAddress?.latitude || 0);
    const lng = Number(selectedAddress?.longitude || 0);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

    const nextFilters = hasCoords
      ? { ...filters, lat, lng, radius: 50000 }
      : filters;

    dispatch(fetchRestaurants(nextFilters));
  }, [dispatch, filters, inSearchMode, selectedAddress]);

  const sourceRestaurants = inSearchMode ? searchResultRestaurants : restaurants;
  const restaurantLookup = useMemo(
    () => new Map((sourceRestaurants || []).map((r) => [String(r._id), r])),
    [sourceRestaurants]
  );
  const displayedRestaurants = selectedCuisine === 'All'
    ? sourceRestaurants
    : sourceRestaurants.filter((r) => Array.isArray(r.cuisines) && r.cuisines.some((c) => String(c).toLowerCase() === selectedCuisine.toLowerCase()));

  const handleCuisine = (label) => {
    setSelectedCuisine(label);
    dispatch(setFilters({ cuisine: label === 'All' ? null : label }));
  };

  return (
    <div className="page-wrapper bg-[#F5F3F1]">

      <div className="max-w-md mx-auto px-4 pt-[max(env(safe-area-inset-top),14px)] mb-4 lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left">
            <MapPinIcon className="h-4 w-4" style={{ color: BRAND }} />
            <div>
              <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">Deliver to</p>
              <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
              <p className="text-[12px] leading-none font-semibold text-gray-900">
                {selectedAddress?.city || t('common.currentArea', 'Current Area')}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
              <img src={logo} alt="Profile" className="h-full w-full object-cover" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-2">
          <div className="rounded-full bg-[#E9E7E5] px-4 py-2.5 flex items-center gap-3 border border-[#E0DDD9]">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('restaurant.searchPlaceholder', 'Search restaurants or menu items')}
              className="flex-1 bg-transparent text-[12px] text-gray-700 placeholder:text-gray-400 outline-none"
            />
            <button type="submit" className="text-[11px] font-semibold" style={{ color: BRAND }}>
              {t('restaurant.search', 'Search')}
            </button>
          </div>
        </form>
      </div>

      {/* ── Sticky cuisine tab row ── */}
      <div
        className="sticky top-0 bg-white z-10"
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

      </div>

      {/* ── Content ── */}
      <div className="max-w-md lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-[388px]:px-3 py-5 max-[388px]:py-4 pb-28 lg:pb-4">
        <div className="mb-5">
          <h1 className="text-xl max-[388px]:text-lg font-bold text-gray-900">
            {inSearchMode ? `${t('restaurant.resultsFor', 'Search results for')} "${searchQuery}"` : t('restaurant.nearYou', 'Restaurants near you')}
          </h1>
          {!loading && !searchLoading && (
            <p className="text-sm max-[388px]:text-xs text-gray-400 mt-0.5">
              {displayedRestaurants.length} {t('restaurant.restaurantsCount', 'restaurants')}
              {inSearchMode ? ` · ${searchResultItems.length} ${t('restaurant.itemsCount', 'items')}` : ''}
              {selectedCuisine !== 'All' ? ` · ${selectedCuisine}` : ''}
            </p>
          )}
        </div>

        {(loading || searchLoading) ? (
          <Loader />
        ) : displayedRestaurants.length === 0 && (!inSearchMode || searchResultItems.length === 0) ? (
          <div className="text-center py-24 max-[388px]:py-20">
            <div className="text-6xl max-[388px]:text-5xl mb-4 animate-float">🍽️</div>
            <h3 className="text-xl max-[388px]:text-lg font-bold text-gray-900 mb-2">{t('restaurant.noRestaurants', 'No restaurants found')}</h3>
            <p className="text-gray-400 text-sm max-[388px]:text-xs mb-5">{t('restaurant.adjustFilter', 'Try adjusting your filter')}</p>
            <button
              onClick={() => { setSelectedCuisine('All'); dispatch(setFilters({ cuisine: null, search: null })); }}
              className="btn-primary text-sm max-[388px]:text-xs"
            >
              {t('restaurant.clearFilters', 'Clear filters')}
            </button>
          </div>
        ) : (
          <>
            {inSearchMode && searchResultItems.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t('restaurant.matchedMenuItems', 'Matched Menu Items')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResultItems.slice(0, 24).map((item) => (
                    (() => {
                      const rid = String(item.restaurantId || '');
                      const restaurant = restaurantLookup.get(rid);
                      const restaurantName = restaurant?.name || item.restaurantName || 'Restaurant';
                      const rating = Number(restaurant?.rating || 0);
                      const deliveryTime = restaurant?.deliveryTime;

                      return (
                        <Link
                          key={item._id}
                          to={`/restaurant/${rid}`}
                          className="bg-white rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-gray-700 mt-0.5 line-clamp-1 font-medium">{restaurantName}</p>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
                            {rating > 0 && <span>★ {rating.toFixed(1)}</span>}
                            {deliveryTime && <span>{deliveryTime} min</span>}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">
                              {Array.isArray(item.categories) && item.categories.length > 0 ? item.categories[0] : item.category || t('restaurant.menuItem', 'Menu Item')}
                            </span>
                            <span className="text-sm font-bold" style={{ color: BRAND }}>₹{item.price}</span>
                          </div>
                        </Link>
                      );
                    })()
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
                    matchedItemsTitle={inSearchMode ? t('restaurant.matchedItems', 'Matched items') : null}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => dispatch(openCart())}
        className="fixed right-5 bottom-[84px] z-50 h-14 w-14 rounded-full text-white flex items-center justify-center lg:hidden"
        style={{ background: 'rgb(255, 94, 26)', boxShadow: 'rgba(234, 88, 12, 0.34) 0px 8px 18px' }}
      >
        <ShoppingBagIcon className="h-6 w-6" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#1f1f1f] text-white text-[8px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
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
    </div>
  );
};

export default RestaurantPage;
