import { useState, useEffect } from 'react';
import { IoSearchOutline, IoClose, IoArrowBack, IoStar, IoTimeOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const popularCategories = [
  { name: 'Pizza', icon: '🍕', color: 'bg-orange-50 text-orange-500' },
  { name: 'Burger', icon: '🍔', color: 'bg-orange-50 text-orange-500' },
  { name: 'Sushi', icon: '🍣', color: 'bg-orange-50 text-orange-500' },
  { name: 'Desserts', icon: '🍰', color: 'bg-orange-50 text-orange-500' },
];

const Search = () => {
  const navigate = useNavigate();
  const { restaurants, filteredRestaurants, loading, searchRestaurants } = useAppContext();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save to recent searches
  const addToRecent = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 3);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      searchRestaurants(value);
      addToRecent(value);
    }
  };

  const clearSearch = () => {
    setQuery('');
    searchRestaurants('');
  };

  const removeRecentSearch = (term) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    searchRestaurants(term);
  };

  const handleCategoryClick = (category) => {
    setQuery(category);
    searchRestaurants(category);
    addToRecent(category);
  };

  const handleRestaurantClick = (id) => {
    navigate(`/restaurant/${id}`);
  };

  // Get trending restaurants (top rated)
  const trendingRestaurants = [...restaurants]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Search</h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 text-lg" />
            <input
              type="text"
              placeholder="Search for food or restaurants"
              value={query}
              onChange={handleSearch}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:bg-gray-100 transition-colors"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <IoClose className="text-xl" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Searches</h2>
              <button 
                onClick={clearAllRecent}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-gray-700 rounded-full text-sm"
                >
                  <button 
                    onClick={() => handleRecentClick(term)}
                    className="font-medium"
                  >
                    {term}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(term);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <IoClose className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Categories */}
        {!query && (
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Popular Categories</h2>
            <div className="grid grid-cols-4 gap-4">
              {popularCategories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center text-2xl`}>
                    {category.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Restaurants */}
        {!query && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Trending Restaurants</h2>
              <button className="text-xs font-semibold text-orange-500 hover:text-orange-600">
                See all →
              </button>
            </div>
            <div className="space-y-3">
              {trendingRestaurants.map((restaurant) => (
                <button
                  key={restaurant._id}
                  onClick={() => handleRestaurantClick(restaurant._id)}
                  className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-100"
                >
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{restaurant.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">
                      {restaurant.cuisine} • {restaurant.priceRange}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <IoStar className="text-orange-500 text-sm" />
                        <span className="font-semibold text-gray-900">{restaurant.rating}</span>
                        <span className="text-gray-400">(2k+)</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <IoTimeOutline className="text-sm" />
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {query && (
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {filteredRestaurants.length} Results
            </h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">😕</p>
                <p className="text-gray-900 font-semibold mb-1">No results found</p>
                <p className="text-sm text-gray-500">Try searching for something else</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRestaurants.map((restaurant) => (
                  <button
                    key={restaurant._id}
                    onClick={() => handleRestaurantClick(restaurant._id)}
                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-100"
                  >
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{restaurant.name}</h3>
                      <p className="text-xs text-gray-500 mb-1">
                        {restaurant.cuisine} • {restaurant.priceRange}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <IoStar className="text-orange-500 text-sm" />
                          <span className="font-semibold text-gray-900">{restaurant.rating}</span>
                          <span className="text-gray-400">(2k+)</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <IoTimeOutline className="text-sm" />
                          <span>{restaurant.deliveryTime}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
