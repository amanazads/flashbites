import { IoSearchOutline, IoFlashOutline, IoClose, IoTimeOutline } from 'react-icons/io5';
import { useAppContext } from '../context/AppContext';
import { useState, useEffect, useRef } from 'react';

const SearchBar = () => {
  const { searchRestaurants } = useAppContext();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const dropdownRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRecent(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save to recent searches
  const addToRecent = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce search - simple implementation
    setTimeout(() => {
      if (value.trim()) {
        searchRestaurants(value);
        addToRecent(value);
      }
    }, 300);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowRecent(true);
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    searchRestaurants(term);
    setShowRecent(false);
    setIsFocused(false);
  };

  const removeRecentSearch = (term, e) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-200" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto relative">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-orange-500' : 'text-gray-400'}`}>
          <IoSearchOutline className="text-lg" />
        </div>
        {query && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <IoFlashOutline className="text-orange-500 text-base" />
          </div>
        )}
        <input
          type="text"
          placeholder="Search for restaurants, cuisines..."
          value={query}
          onChange={handleSearch}
          onFocus={handleFocus}
          className="w-full pl-11 pr-11 py-3 bg-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 border border-gray-300 transition-all text-sm text-gray-700 placeholder:text-gray-400"
        />

        {/* Recent Searches Dropdown */}
        {showRecent && !query && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-600 uppercase">Recent Searches</h3>
              <button 
                onClick={clearAllRecent}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600"
              >
                Clear All
              </button>
            </div>
            <div className="py-1">
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentClick(term)}
                  className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <IoTimeOutline className="text-gray-400 text-lg" />
                    <span className="text-sm text-gray-700 font-medium">{term}</span>
                  </div>
                  <button
                    onClick={(e) => removeRecentSearch(term, e)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IoClose className="text-lg" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
