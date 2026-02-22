import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { fetchRestaurants, setFilters } from '../redux/slices/restaurantSlice';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import { Loader } from '../components/common/Loader';
import { CUISINES } from '../utils/constants';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const CUISINE_TABS = [
  { id: 'All',           label: 'All',       emoji: '🍽️' },
  { id: 'Pizza',         label: 'Pizza',     emoji: '🍕' },
  { id: 'Burger',        label: 'Burgers',   emoji: '🍔' },
  { id: 'Indian',        label: 'Thali',     emoji: '🍛' },
  { id: 'Chinese',       label: 'Noodles',   emoji: '🥡' },
  { id: 'Italian',       label: 'Pasta',     emoji: '🍝' },
  { id: 'Japanese',      label: 'Sushi',     emoji: '🍣' },
  { id: 'Mexican',       label: 'Mexican',   emoji: '🌮' },
  { id: 'Thai',          label: 'Thai',      emoji: '🍜' },
  { id: 'Fast Food',     label: 'Fast Food', emoji: '🍟' },
  { id: 'Desserts',      label: 'Desserts',  emoji: '🍰' },
  { id: 'Coffee',        label: 'Drinks',    emoji: '☕' },
];

const SORT_OPTIONS = ['Ratings 4.0+', 'New to you', 'Fastest delivery', 'Free delivery'];

const BRAND = '#96092B';

const RestaurantPage = () => {
  const dispatch = useDispatch();
  const { restaurants, loading, filters } = useSelector((s) => s.restaurant);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [activeSort, setActiveSort] = useState(null);
  const routerLocation = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const searchQ = params.get('search');
    const cuisineQ = params.get('cuisine');
    if (searchQ) dispatch(setFilters({ search: searchQ }));
    if (cuisineQ) { setSelectedCuisine(cuisineQ); dispatch(setFilters({ cuisine: cuisineQ })); }
    else dispatch(fetchRestaurants(filters));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchRestaurants(filters));
  }, [dispatch, filters]);

  const handleCuisine = (label) => {
    setSelectedCuisine(label);
    dispatch(setFilters({ cuisine: label === 'All' ? null : label }));
  };

  return (
    <div className="page-wrapper">

      {/* ── Sticky cuisine tab row ── */}
      <div className="sticky bg-white z-10"
        style={{
          top: '60px',        /* height of mobile top bar */
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-3">
            {CUISINE_TABS.map((tab) => {
              const active = selectedCuisine === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleCuisine(tab.id)}
                  className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-200 min-w-[52px]"
                  style={active
                    ? { background: '#fcf0f3', color: BRAND }
                    : { color: '#9CA3AF' }}
                >
                  <span className="text-2xl leading-none">{tab.emoji}</span>
                  <span className="text-[11px] font-semibold mt-1 whitespace-nowrap"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button className="flex-shrink-0 flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm hover:border-gray-300 transition-all">
              <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
              Filters
            </button>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSort(activeSort === s ? null : s)}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Restaurants near you</h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {restaurants.length} restaurants{selectedCuisine !== 'All' ? ` · ${selectedCuisine}` : ''}
            </p>
          )}
        </div>

        {loading ? (
          <Loader />
        ) : restaurants.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4 animate-float">🍽️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-400 text-sm mb-5">Try adjusting your filter</p>
            <button
              onClick={() => { setSelectedCuisine('All'); dispatch(setFilters({ cuisine: null, search: null })); }}
              className="btn-primary text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {restaurants.map((r) => (
              <RestaurantCard key={r._id} restaurant={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantPage;