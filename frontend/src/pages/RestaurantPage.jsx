import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurants, setFilters } from '../redux/slices/restaurantSlice';
import RestaurantCard from '../components/restaurant/RestaurantCard';
import SearchBar from '../components/common/SearchBar';
import { Loader } from '../components/common/Loader';
import { CUISINES } from '../utils/constants';

const RestaurantPage = () => {
  const dispatch = useDispatch();
  const { restaurants, loading, filters } = useSelector((state) => state.restaurant);
  const [selectedCuisine, setSelectedCuisine] = useState(null);

  useEffect(() => {
    dispatch(fetchRestaurants(filters));
  }, [dispatch, filters]);

  const handleSearch = (query) => {
    dispatch(setFilters({ search: query }));
  };

  const handleCuisineFilter = (cuisine) => {
    setSelectedCuisine(cuisine === selectedCuisine ? null : cuisine);
    dispatch(setFilters({ cuisine: cuisine === selectedCuisine ? null : cuisine }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Restaurants near you
          </h1>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search for restaurants or cuisines..."
          />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Cuisine</h3>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => handleCuisineFilter(cuisine)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCuisine === cuisine
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* Restaurant Grid */}
        {loading ? (
          <Loader />
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No restaurants found
            </h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant._id} restaurant={restaurant} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantPage;