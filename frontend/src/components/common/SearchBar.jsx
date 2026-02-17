import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchBar = ({ onSearch, placeholder = 'Search...' }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full flex flex-col sm:block gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <MagnifyingGlassIcon className="absolute left-3 top-4 sm:top-1/2 transform sm:-translate-y-1/2 h-5 w-5 text-gray-400" />
      <button type="submit" className="btn-primary sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 py-2.5 sm:py-2">
        Search
      </button>
    </form>
  );
};

export default SearchBar;