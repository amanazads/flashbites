import { useState } from 'react';
import PropTypes from 'prop-types';
import { IoFunnelOutline, IoClose } from 'react-icons/io5';

const FilterSection = ({ onFilterChange }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'rating',
    freeDelivery: false,
    minRating: 0,
    priceRange: 'all',
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters = {
      sortBy: 'rating',
      freeDelivery: false,
      minRating: 0,
      priceRange: 'all',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = [
    filters.freeDelivery,
    filters.minRating > 0,
    filters.priceRange !== 'all',
    filters.sortBy !== 'rating'
  ].filter(Boolean).length;

  return (
    <>
      {/* Filter Button - Always visible */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative"
          >
            <IoFunnelOutline className="text-orange-500 text-base" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick Sort Pills */}
          <div className="flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex gap-2">
              {[
                { value: 'rating', label: 'Top Rated' },
                { value: 'deliveryTime', label: 'Fastest' },
                { value: 'priceAsc', label: 'Budget' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('sortBy', option.value)}
                  className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filters.sortBy === option.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal/Bottom Sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:flex lg:items-center lg:justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowFilters(false)}
          />
          
          {/* Modal Content */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl lg:rounded-2xl lg:relative lg:max-w-2xl lg:w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Filters & Sort</h3>
                <p className="text-xs text-gray-500 mt-0.5">Refine your restaurant search</p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <IoClose className="text-xl text-gray-600" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Sort By */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Sort By</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'rating', label: '⭐ Top Rated', desc: 'Highest ratings first' },
                    { value: 'deliveryTime', label: '⚡ Fastest', desc: 'Quick delivery' },
                    { value: 'priceAsc', label: '💰 Budget', desc: 'Low to high' },
                    { value: 'priceDesc', label: '💎 Premium', desc: 'High to low' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('sortBy', option.value)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        filters.sortBy === option.value
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className={`text-xs mt-0.5 ${
                        filters.sortBy === option.value ? 'text-orange-100' : 'text-gray-500'
                      }`}>
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Delivery Options</label>
                <button
                  onClick={() => handleFilterChange('freeDelivery', !filters.freeDelivery)}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                    filters.freeDelivery
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    filters.freeDelivery
                      ? 'border-white bg-white'
                      : 'border-gray-300'
                  }`}>
                    {filters.freeDelivery && (
                      <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">🚚 Free Delivery</div>
                    <div className={`text-xs mt-0.5 ${
                      filters.freeDelivery ? 'text-orange-100' : 'text-gray-500'
                    }`}>
                      No delivery charges
                    </div>
                  </div>
                </button>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Minimum Rating</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 0, label: 'Any', stars: '' },
                    { value: 3, label: '3.0+', stars: '⭐⭐⭐' },
                    { value: 4, label: '4.0+', stars: '⭐⭐⭐⭐' },
                    { value: 4.5, label: '4.5+', stars: '⭐⭐⭐⭐⭐' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('minRating', option.value)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        filters.minRating === option.value
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-bold text-sm">{option.label}</div>
                      {option.stars && (
                        <div className="text-xs mt-1">{option.stars}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Price Range</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'all', label: 'All', desc: 'Any price' },
                    { value: '$', label: '$', desc: 'Budget' },
                    { value: '$$', label: '$$', desc: 'Moderate' },
                    { value: '$$$', label: '$$$', desc: 'Premium' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('priceRange', option.value)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        filters.priceRange === option.value
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-bold text-base">{option.label}</div>
                      <div className={`text-xs mt-1 ${
                        filters.priceRange === option.value ? 'text-orange-100' : 'text-gray-500'
                      }`}>
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={resetFilters}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

FilterSection.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
};

export default FilterSection;
